import React from "react";

interface Props {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ title, onClose, wide, children, footer }: Props) {
  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className={"modal" + (wide ? " wide" : "")} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
