import React from 'react';
import './Modales.css'; // Importamos los estilos que crearemos en el paso 3

export default function AgregarCine({ onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-contenedor">
        <div className="modal-cabecera">
          <h2 className="modal-titulo">Agregar Cine</h2>
          <div className="modal-estado">
            <label>Estado</label>
            <select className="select-estado">
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <form className="modal-formulario">
          <h3 className="modal-subtitulo">Información</h3>
          
          <div className="input-grupo">
            <label>Nombre</label>
            <input type="text" placeholder="Nombre del cine" />
          </div>

          <div className="fila-doble">
            <div className="input-grupo">
              <label>Dirección</label>
              <input type="text" placeholder="Dirección completa" />
            </div>
            <div className="input-grupo">
              <label>Cant. de Salas</label>
              <input type="number" placeholder="Ej. 5" />
            </div>
          </div>

          <div className="input-grupo">
            <label>Observaciones</label>
            <textarea rows="4" placeholder="Añade observaciones..."></textarea>
          </div>

          <div className="modal-botones">
            <button type="button" className="btn-cancelar" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn-agregar">Agregar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
