import React from 'react';
import './Locales.css';

// ─── Datos temporales (se reemplazarán con llamadas a la API) ───────────────
const LOCALES = [
  {
    id: 1,
    nombre: 'Filmate Centro',
    direccion: 'Jr. de la Unión 870, Cercado de Lima, Lima, Perú.',
    horario: 'Lunes a Domingo – 10:00 a.m. a 10:00 p.m.',
    lat: -12.0464,
    lng: -77.0428,
    mapUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.8!2d-77.0428!3d-12.0464!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDAyJzQ3LjAiUyA3N8KwMDInMzQuMSJX!5e0!3m2!1ses!2spe!4v1234567890',
  },
  {
    id: 2,
    nombre: 'Filmate La Molina',
    direccion: 'Av. La Molina 1234, La Molina, Lima, Perú.',
    horario: 'Lunes a Domingo – 10:00 a.m. a 10:00 p.m.',
    lat: -12.0858,
    lng: -76.9453,
    mapUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3902.5!2d-76.9453!3d-12.0858!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDA1JzA4LjkiUyA3NsKwNTYnNDMuMSJX!5e0!3m2!1ses!2spe!4v1234567891',
  },
  {
    id: 3,
    nombre: 'Filmate Norte',
    direccion: 'Av. Universitaria 789, Los Olivos, Lima, Perú.',
    horario: 'Lunes a Domingo – 10:00 a.m. a 10:00 p.m.',
    lat: -11.9897,
    lng: -77.0697,
    mapUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3900.2!2d-77.0697!3d-11.9897!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTHCsDU5JzIyLjkiUyA3N8KwMDQnMTAuOSJX!5e0!3m2!1ses!2spe!4v1234567892',
  },
  {
    id: 4,
    nombre: 'Filmate Este',
    direccion: 'Carretera Central 321, Ate, Lima, Perú.',
    horario: 'Lunes a Domingo – 10:00 a.m. a 10:00 p.m.',
    lat: -12.0261,
    lng: -76.9142,
    mapUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.4!2d-76.9142!3d-12.0261!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDAx!5e0!3m2!1ses!2spe!4v1234567893',
  },
];

export default function Locales() {
  return (
    <div className="locales-page">
      <h1 className="locales-titulo">Nuestros locales</h1>

      <div className="locales-lista">
        {LOCALES.map((local, index) => (
          <div
            key={local.id}
            className="local-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Mapa embebido */}
            <div className="local-mapa">
              <iframe
                title={`Mapa ${local.nombre}`}
                src={local.mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: '10px' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Info */}
            <div className="local-info">
              <h2 className="local-nombre">{local.nombre}</h2>
              <div className="local-dato">
                <span className="local-icono">📍</span>
                <div>
                  <span className="local-etiqueta">Dirección: </span>
                  {local.direccion}
                </div>
              </div>
              <div className="local-dato">
                <span className="local-icono">🕐</span>
                <div>
                  <span className="local-etiqueta">Horarios de atención:</span>
                  <br />
                  {local.horario}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
