import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { citizensApi, geoApi } from '../../api/index.js';
import IneCaptureField from '../../components/ine-capture/IneCaptureField.jsx';

/** Solo `true` / `1` / `yes` (insensible a mayúsculas) habilitan la UI; por defecto deshabilitado. */
function isGoogleMapsUiEnabled() {
  const v = String(import.meta.env.VITE_GOOGLE_MAPS_ENABLED ?? '')
    .trim()
    .toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

const empty = {
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  curp: '',
  sexo: 'X',
  fecha_nacimiento: '',
  clave_elector: '',
  ocr: '',
  seccion_electoral: '',
  telefono: '',
  correo: '',
  address: {
    calle: '',
    numero: '',
    colonia: '',
    municipio: '',
    estado: '',
    codigo_postal: '',
    latitud: '',
    longitud: '',
    is_primary: true,
  },
};

function emptyToNull(v) {
  if (v == null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return v;
}

function formatApiDetail(detail, fallback = 'Error desconocido') {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.msg) return item.msg;
        if (item?.message) return item.message;
        return JSON.stringify(item);
      })
      .join(' · ');
  }
  if (typeof detail === 'object') {
    const parts = [];
    if (detail.message) parts.push(String(detail.message));
    const qualityErrors = detail.quality?.errors;
    if (Array.isArray(qualityErrors) && qualityErrors.length) {
      parts.push(
        qualityErrors
          .map((e) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e)))
          .join(' · '),
      );
    }
    if (parts.length) return parts.join(' — ');
  }
  return fallback;
}

function buildIneFingerprint(front, back) {
  if (!front || !back) return '';
  return `${front.name}:${front.size}:${front.lastModified}|${back.name}:${back.size}:${back.lastModified}`;
}

function Field({ label, k, type = 'text', addr, data, set, setAddr, readOnly, ...rest }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className={`input${readOnly ? ' bg-slate-50 text-slate-600' : ''}`}
        type={type}
        readOnly={readOnly}
        value={addr ? data.address[k] || '' : data[k] || ''}
        onChange={(e) => (addr ? setAddr(k, e.target.value) : set(k, e.target.value))}
        {...rest}
      />
    </div>
  );
}

export default function CitizenFormPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const googleMapsUiEnabled = isGoogleMapsUiEnabled();

  const { data: existingCitizen, isLoading: loadingCitizen } = useQuery({
    queryKey: ['citizen-edit', editId],
    queryFn: () => citizensApi.get(editId),
    enabled: isEdit,
  });

  const {
    data: geoReady,
    isPending: geoReadyPending,
    isError: geoReadyError,
  } = useQuery({
    queryKey: ['geo-google-ready'],
    queryFn: () => geoApi.googleMapsReady(),
    staleTime: 60_000,
    retry: 2,
    enabled: googleMapsUiEnabled,
  });
  const geoConfigured = geoReady?.configured === true;

  const [data, setData] = useState(empty);
  const [ineFront, setIneFront] = useState(null);
  const [ineBack, setIneBack] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [googleSearch, setGoogleSearch] = useState('');
  const [googlePredictions, setGooglePredictions] = useState([]);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googlePicking, setGooglePicking] = useState(false);

  const manualCoordsRef = useRef(false);
  const lastQueryRef = useRef('');
  const abortRef = useRef(null);
  const ocrFingerprintRef = useRef('');

  const handleFileSelected = (file, side) => {
    if (side === 'front') setIneFront(file || null);
    else setIneBack(file || null);
    if (!file) {
      ocrFingerprintRef.current = '';
      setOcrSuccess(false);
    }
  };

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const setAddr = (k, v) =>
    setData((d) => {
      const nextAddress = { ...d.address, [k]: v };
      if (k === 'latitud' || k === 'longitud') {
        manualCoordsRef.current = !!(nextAddress.latitud || nextAddress.longitud);
      }
      return { ...d, address: nextAddress };
    });

  const buildGeoQuery = (a) => {
    const parts = [
      [a.calle, a.numero].filter(Boolean).join(' '),
      a.colonia,
      a.municipio,
      a.estado,
      a.codigo_postal,
      'México',
    ]
      .map((p) => (p || '').trim())
      .filter(Boolean);
    return parts.length > 1 ? parts.join(', ') : '';
  };

  const geocodeAddress = async ({ silent = false } = {}) => {
    const query = buildGeoQuery(data.address);
    if (!query) {
      if (!silent) toast.error('Captura al menos calle, colonia o municipio para geolocalizar.');
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGeoLoading(true);
    try {
      const { formatted_address, latitud, longitud } = await geoApi.geocode(query);
      setData((d) => ({
        ...d,
        address: {
          ...d.address,
          latitud: Number(latitud).toFixed(7),
          longitud: Number(longitud).toFixed(7),
        },
      }));
      manualCoordsRef.current = false;
      if (!silent) {
        toast.success(`Coordenadas obtenidas: ${formatted_address || query}`);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      const detail = err?.response?.data?.detail;
      const msg =
        typeof detail === 'string'
          ? detail
          : 'No se pudo geolocalizar la dirección. Verifica GOOGLE_MAPS_API_KEY y Geocoding API.';
      if (!silent) toast.error(msg);
    } finally {
      setGeoLoading(false);
    }
  };

  const pickGooglePlace = async (placeId, description) => {
    setGoogleOpen(false);
    setGooglePredictions([]);
    setGooglePicking(true);
    try {
      const d = await geoApi.googlePlaceDetails(placeId);
      const nextAddr = {
        calle: d.calle ?? '',
        numero: d.numero ?? '',
        colonia: d.colonia ?? '',
        municipio: d.municipio ?? '',
        estado: d.estado ?? '',
        codigo_postal: d.codigo_postal ?? '',
        latitud:
          d.latitud != null && Number.isFinite(Number(d.latitud))
            ? Number(d.latitud).toFixed(7)
            : '',
        longitud:
          d.longitud != null && Number.isFinite(Number(d.longitud))
            ? Number(d.longitud).toFixed(7)
            : '',
        is_primary: true,
      };
      manualCoordsRef.current = !!(nextAddr.latitud || nextAddr.longitud);
      lastQueryRef.current = buildGeoQuery(nextAddr);
      setData((prev) => ({ ...prev, address: { ...prev.address, ...nextAddr } }));
      setGoogleSearch(d.formatted_address || description || '');
      toast.success('Dirección aplicada desde Google Maps');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'No se pudo cargar el lugar.');
    } finally {
      setGooglePicking(false);
    }
  };

  useEffect(() => {
    if (!googleMapsUiEnabled || !geoConfigured) {
      setGooglePredictions([]);
      return;
    }
    const q = googleSearch.trim();
    if (q.length < 3) {
      setGooglePredictions([]);
      return;
    }
    const handle = setTimeout(async () => {
      setGoogleLoading(true);
      try {
        const res = await geoApi.googleAutocomplete(q);
        const preds = res.predictions ?? [];
        setGooglePredictions(preds);
        if (preds.length > 0) setGoogleOpen(true);
      } catch (err) {
        setGooglePredictions([]);
        const detail = err?.response?.data?.detail;
        if (typeof detail === 'string' && !detail.includes('no está configurado')) {
          toast.error(detail);
        }
      } finally {
        setGoogleLoading(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [googleSearch, geoConfigured, googleMapsUiEnabled]);

  useEffect(() => {
    if (!existingCitizen || !isEdit) return;
    const addr =
      existingCitizen.addresses?.find((a) => a.is_primary) ?? existingCitizen.addresses?.[0];
    manualCoordsRef.current = !!(
      (addr?.latitud != null && String(addr.latitud).trim() !== '') ||
      (addr?.longitud != null && String(addr.longitud).trim() !== '')
    );
    const loadedAddr = {
      calle: addr?.calle ?? '',
      numero: addr?.numero ?? '',
      colonia: addr?.colonia ?? '',
      municipio: addr?.municipio ?? '',
      estado: addr?.estado ?? '',
      codigo_postal: addr?.codigo_postal ?? '',
      latitud: addr?.latitud != null ? String(addr.latitud) : '',
      longitud: addr?.longitud != null ? String(addr.longitud) : '',
      is_primary: true,
    };
    lastQueryRef.current = buildGeoQuery(loadedAddr);
    setData({
      nombre: existingCitizen.nombre,
      apellido_paterno: existingCitizen.apellido_paterno,
      apellido_materno: existingCitizen.apellido_materno ?? '',
      curp: existingCitizen.curp,
      sexo: existingCitizen.sexo ?? 'X',
      fecha_nacimiento:
        typeof existingCitizen.fecha_nacimiento === 'string'
          ? existingCitizen.fecha_nacimiento.slice(0, 10)
          : existingCitizen.fecha_nacimiento ?? '',
      clave_elector: existingCitizen.clave_elector ?? '',
      ocr: existingCitizen.ocr ?? '',
      seccion_electoral: existingCitizen.seccion_electoral ?? '',
      telefono: existingCitizen.telefono ?? '',
      correo: existingCitizen.correo ?? '',
      address: loadedAddr,
    });
    setIsActive(existingCitizen.is_active !== false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCitizen, isEdit]);

  useEffect(() => {
    if (manualCoordsRef.current) return;
    const query = buildGeoQuery(data.address);
    if (!query || query.split(',').length < 3) return;
    if (query === lastQueryRef.current) return;

    const handle = setTimeout(() => {
      lastQueryRef.current = query;
      geocodeAddress({ silent: true });
    }, 1200);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data.address.calle,
    data.address.numero,
    data.address.colonia,
    data.address.municipio,
    data.address.estado,
    data.address.codigo_postal,
  ]);

  const runOCR = useCallback(async () => {
    if (!ineFront || !ineBack) return;

    const fingerprint = buildIneFingerprint(ineFront, ineBack);
    ocrFingerprintRef.current = fingerprint;

    setOcrLoading(true);
    setOcrSuccess(false);
    const errors = [];
    try {
      const [frontSettled, backSettled] = await Promise.allSettled([
        citizensApi.ocr(ineFront, 'INE_FRONT', { force: true }),
        citizensApi.ocr(ineBack, 'INE_BACK', { force: true }),
      ]);

      const frontRes = frontSettled.status === 'fulfilled' ? frontSettled.value : null;
      const backRes = backSettled.status === 'fulfilled' ? backSettled.value : null;

      if (frontSettled.status === 'rejected') {
        errors.push(
          `Frente: ${formatApiDetail(
            frontSettled.reason?.response?.data?.detail,
            'No se pudo procesar el frente de la INE',
          )}`,
        );
      }
      if (backSettled.status === 'rejected') {
        errors.push(
          `Reverso: ${formatApiDetail(
            backSettled.reason?.response?.data?.detail,
            'No se pudo procesar el reverso de la INE',
          )}`,
        );
      }

      if (!frontRes && !backRes) {
        toast.error(
          errors.length
            ? errors.join('\n')
            : 'No se pudo procesar la INE. Intenta de nuevo con imágenes más nítidas.',
          { duration: 8000 },
        );
        return;
      }

      const pick = (field, preferBack = false) => {
        if (preferBack && backRes?.[field]) return backRes[field];
        if (frontRes?.[field]) return frontRes[field];
        if (backRes?.[field]) return backRes[field];
        return null;
      };

      const detected = {
        nombre: pick('nombre'),
        apellido_paterno: pick('apellido_paterno'),
        apellido_materno: pick('apellido_materno'),
        curp: pick('curp', true),
        sexo: pick('sexo', true),
        fecha_nacimiento: pick('fecha_nacimiento', true),
        clave_elector: pick('clave_elector'),
        ocr: pick('ocr', true),
        seccion_electoral: pick('seccion_electoral'),
      };

      const addr = frontRes?.address || backRes?.address || {};
      const hasAddress = Object.keys(addr).length > 0;

      setData((d) => ({
        ...d,
        nombre: detected.nombre || d.nombre,
        apellido_paterno: detected.apellido_paterno || d.apellido_paterno,
        apellido_materno: detected.apellido_materno || d.apellido_materno,
        curp: detected.curp || d.curp,
        sexo: detected.sexo || d.sexo,
        fecha_nacimiento: detected.fecha_nacimiento || d.fecha_nacimiento,
        clave_elector: detected.clave_elector || d.clave_elector,
        ocr: detected.ocr || d.ocr,
        seccion_electoral: detected.seccion_electoral || d.seccion_electoral,
        address: {
          ...d.address,
          calle: addr.calle || d.address.calle,
          numero: addr.numero || d.address.numero,
          colonia: addr.colonia || d.address.colonia,
          municipio: addr.municipio || d.address.municipio,
          estado: addr.estado || d.address.estado,
          codigo_postal: addr.codigo_postal || d.address.codigo_postal,
        },
      }));

      if (hasAddress) {
        manualCoordsRef.current = false;
      }

      const detectedCount = Object.values(detected).filter(Boolean).length;
      if (detectedCount === 0) {
        errors.push('No se reconocieron datos en los documentos.');
      }

      if (errors.length) {
        toast.error(errors.join('\n'), { duration: 8000 });
        return;
      }

      setOcrSuccess(true);
      toast.success('Los datos se han procesado correctamente.');
    } catch (err) {
      toast.error(
        formatApiDetail(err?.response?.data?.detail, err?.message || 'Error al procesar la INE'),
        { duration: 8000 },
      );
    } finally {
      setOcrLoading(false);
    }
  }, [ineFront, ineBack]);

  useEffect(() => {
    if (!ineFront || !ineBack || ocrLoading) return undefined;

    const fingerprint = buildIneFingerprint(ineFront, ineBack);
    if (fingerprint === ocrFingerprintRef.current) return undefined;

    const timer = setTimeout(() => {
      runOCR();
    }, 450);

    return () => clearTimeout(timer);
  }, [ineFront, ineBack, ocrLoading, runOCR]);

  const retryOCR = () => {
    ocrFingerprintRef.current = '';
    setOcrSuccess(false);
    runOCR();
  };

  const bothIneReady = Boolean(ineFront && ineBack);
  /** Creación: tras OCR exitoso. Edición: si no está reemplazando la INE (sin archivos nuevos). */
  const showDetailsAfterOcr =
    ocrSuccess || (isEdit && existingCitizen && !bothIneReady);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const addrPayload = {
        calle: emptyToNull(data.address.calle),
        numero: emptyToNull(data.address.numero),
        colonia: emptyToNull(data.address.colonia),
        municipio: emptyToNull(data.address.municipio),
        estado: emptyToNull(data.address.estado),
        codigo_postal: emptyToNull(data.address.codigo_postal),
        latitud: data.address.latitud ? Number(data.address.latitud) : null,
        longitud: data.address.longitud ? Number(data.address.longitud) : null,
        is_primary: true,
      };

      if (isEdit) {
        await citizensApi.update(editId, {
          nombre: data.nombre.trim(),
          apellido_paterno: data.apellido_paterno.trim(),
          apellido_materno: emptyToNull(data.apellido_materno),
          sexo: data.sexo,
          fecha_nacimiento: emptyToNull(data.fecha_nacimiento),
          clave_elector: emptyToNull(data.clave_elector),
          ocr: emptyToNull(data.ocr),
          seccion_electoral: emptyToNull(data.seccion_electoral),
          telefono: emptyToNull(data.telefono),
          correo: emptyToNull(data.correo),
          is_active: isActive,
        });
        await citizensApi.upsertAddress(editId, addrPayload);
        if (ineFront) await citizensApi.uploadIne(editId, ineFront, 'INE_FRONT');
        if (ineBack) await citizensApi.uploadIne(editId, ineBack, 'INE_BACK');
        toast.success('Ciudadano actualizado');
        navigate(`/citizens/${editId}`);
      } else {
        const payload = {
          nombre: data.nombre.trim(),
          apellido_paterno: data.apellido_paterno.trim(),
          apellido_materno: emptyToNull(data.apellido_materno),
          curp: data.curp.trim().toUpperCase(),
          sexo: data.sexo,
          fecha_nacimiento: emptyToNull(data.fecha_nacimiento),
          clave_elector: emptyToNull(data.clave_elector),
          ocr: emptyToNull(data.ocr),
          seccion_electoral: emptyToNull(data.seccion_electoral),
          telefono: emptyToNull(data.telefono),
          correo: emptyToNull(data.correo),
          address: addrPayload,
        };
        const created = await citizensApi.create(payload);
        if (ineFront) await citizensApi.uploadIne(created.id, ineFront, 'INE_FRONT');
        if (ineBack) await citizensApi.uploadIne(created.id, ineBack, 'INE_BACK');
        toast.success('Ciudadano registrado');
        navigate(`/citizens/${created.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loadingCitizen) {
    return <p className="text-slate-500">Cargando datos del ciudadano…</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">
          {isEdit ? 'Editar ciudadano' : 'Registro de ciudadano'}
        </h2>
        <p className="text-sm text-slate-500">
          {isEdit
            ? 'Modifica los datos y el domicilio. La CURP no se puede cambiar.'
            : 'Captura por OCR o manual. Los apoyos se asignan después.'}
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="card">
          <h3 className="font-semibold text-slate-800 mb-1">Paso 1 · INE / OCR</h3>
          <p className="text-sm text-slate-500 mb-4">
            <span className="lg:hidden">
              Captura o sube el frente y el reverso; al tener ambos se extraen los datos
              automáticamente.
            </span>
            <span className="hidden lg:inline">
              Sube el frente y el reverso de la INE; al tener ambos se extraen los datos
              automáticamente.
            </span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IneCaptureField
              label="Frente de la INE"
              side="front"
              file={ineFront}
              onChange={(f) => handleFileSelected(f, 'front')}
            />
            <IneCaptureField
              label="Reverso de la INE"
              side="back"
              file={ineBack}
              onChange={(f) => handleFileSelected(f, 'back')}
            />
          </div>

          {bothIneReady && (
            <div className="mt-4">
              {ocrLoading ? (
                <p className="text-sm text-brand-800 inline-flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-brand-600 border-t-transparent animate-spin"
                    aria-hidden
                  />
                  Extrayendo datos de la INE…
                </p>
              ) : ocrSuccess ? (
                <p className="text-sm text-emerald-700">
                  Datos extraídos. Revisa el formulario y corrige si hace falta.
                </p>
              ) : (
                <button type="button" className="btn-secondary" onClick={retryOCR}>
                  Reintentar extracción OCR
                </button>
              )}
            </div>
          )}
        </section>

        {showDetailsAfterOcr && (
          <>
        <section className="card">
          <h3 className="font-semibold text-slate-800 mb-3">Datos personales</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Nombre" k="nombre" data={data} set={set} setAddr={setAddr} required />
            <Field
              label="Apellido paterno"
              k="apellido_paterno"
              data={data}
              set={set}
              setAddr={setAddr}
              required
            />
            <Field
              label="Apellido materno"
              k="apellido_materno"
              data={data}
              set={set}
              setAddr={setAddr}
            />
            <Field
              label="CURP"
              k="curp"
              data={data}
              set={set}
              setAddr={setAddr}
              required
              readOnly={isEdit}
            />
            <div>
              <label className="label">Sexo</label>
              <select
                className="input"
                value={data.sexo}
                onChange={(e) => set('sexo', e.target.value)}
              >
                <option value="H">Hombre</option>
                <option value="M">Mujer</option>
                <option value="X">No especificado</option>
              </select>
            </div>
            <Field
              label="Fecha de nacimiento"
              k="fecha_nacimiento"
              type="date"
              data={data}
              set={set}
              setAddr={setAddr}
            />
            <Field label="Clave de elector" k="clave_elector" data={data} set={set} setAddr={setAddr} />
            <Field label="OCR / Número de documento" k="ocr" data={data} set={set} setAddr={setAddr} />
            <Field
              label="Sección"
              k="seccion_electoral"
              data={data}
              set={set}
              setAddr={setAddr}
            />
            <Field label="Teléfono" k="telefono" data={data} set={set} setAddr={setAddr} />
            <Field label="Correo" k="correo" type="email" data={data} set={set} setAddr={setAddr} />
            {isEdit && (
              <div className="md:col-span-3 flex items-center gap-2 pt-1">
                <input
                  id="citizen-active"
                  type="checkbox"
                  className="rounded border-slate-300"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="citizen-active" className="text-sm text-slate-700">
                  Ciudadano activo en el sistema
                </label>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h3 className="font-semibold text-slate-800 mb-3">Domicilio</h3>
          {googleMapsUiEnabled ? (
            <>
              <p className="text-xs text-slate-500 mb-3">
                {geoReadyPending
                  ? 'Comprobando búsqueda de direcciones…'
                  : geoReadyError
                    ? 'No se pudo comprobar el servicio de direcciones. Revisa tu sesión y la red; puedes llenar el domicilio a mano.'
                    : geoConfigured
                      ? 'Busca una dirección con Google Maps para rellenar calle, colonia y coordenadas; puedes ajustar después a mano.'
                      : 'Completa el domicilio en los campos siguientes.'}
              </p>
              <div className="relative mb-4 md:col-span-3">
                <label className="label">Buscar dirección (Google Maps)</label>
                <input
                  className="input"
                  disabled={geoReadyPending || !geoConfigured || googlePicking}
                  placeholder={
                    geoReadyPending
                      ? 'Comprobando…'
                      : geoConfigured
                        ? 'Escribe calle, colonia o lugar…'
                        : 'Búsqueda no disponible'
                  }
                  value={googleSearch}
                  autoComplete="off"
                  onChange={(e) => {
                    setGoogleSearch(e.target.value);
                    setGoogleOpen(true);
                  }}
                  onFocus={() => googlePredictions.length > 0 && setGoogleOpen(true)}
                  onBlur={() => setTimeout(() => setGoogleOpen(false), 200)}
                />
                {googleLoading && (
                  <p className="mt-1 text-xs text-slate-400">Buscando sugerencias…</p>
                )}
                {googleOpen && geoConfigured && googlePredictions.length > 0 && (
                  <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                    {googlePredictions.map((p) => (
                      <li key={p.place_id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickGooglePlace(p.place_id, p.description)}
                        >
                          {p.description}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500 mb-3">
              Completa el domicilio en los campos siguientes.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Calle" k="calle" addr data={data} set={set} setAddr={setAddr} />
            <Field label="Número" k="numero" addr data={data} set={set} setAddr={setAddr} />
            <Field label="Colonia" k="colonia" addr data={data} set={set} setAddr={setAddr} />
            <Field label="Municipio" k="municipio" addr data={data} set={set} setAddr={setAddr} />
            <Field label="Estado" k="estado" addr data={data} set={set} setAddr={setAddr} />
            <Field
              label="Código postal"
              k="codigo_postal"
              addr
              data={data}
              set={set}
              setAddr={setAddr}
            />
            <Field label="Latitud" k="latitud" addr data={data} set={set} setAddr={setAddr} />
            <Field label="Longitud" k="longitud" addr data={data} set={set} setAddr={setAddr} />
          </div>
          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <p className="text-xs text-slate-500">
              {geoLoading
                ? 'Buscando coordenadas automáticamente…'
                : manualCoordsRef.current
                  ? 'Coordenadas capturadas manualmente. Borra los campos para reactivar la geolocalización automática.'
                  : 'La latitud y longitud se detectan automáticamente al capturar el domicilio.'}
            </p>
            <button
              type="button"
              onClick={() => geocodeAddress()}
              className="btn-secondary"
              disabled={geoLoading}
            >
              {geoLoading ? 'Buscando…' : 'Volver a geolocalizar'}
            </button>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar ciudadano'}
          </button>
        </div>
          </>
        )}
      </form>
    </div>
  );
}
