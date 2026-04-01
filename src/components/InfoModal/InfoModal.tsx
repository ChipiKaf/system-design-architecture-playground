import React, { useEffect } from "react";
import "./InfoModal.scss";

export interface InfoModalSection {
  title: string;
  content: React.ReactNode;
  accent?: string;
}

export interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accentColor?: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  accentColor = "#60a5fa",
  sections,
  aside,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="info-modal-backdrop" onClick={onClose} />
      <div
        className="info-modal"
        style={{ "--accent": accentColor } as React.CSSProperties}
      >
        <div className="info-modal__header">
          <div>
            <h2 className="info-modal__title">{title}</h2>
            {subtitle && <p className="info-modal__subtitle">{subtitle}</p>}
          </div>
          <button className="info-modal__close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="info-modal__body">
          <div className="info-modal__sections">
            {sections.map((section, i) => (
              <div
                key={i}
                className="info-modal__section"
                style={
                  section.accent
                    ? ({
                        "--section-accent": section.accent,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <h3 className="info-modal__section-title">{section.title}</h3>
                <div className="info-modal__section-content">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
          {aside && <div className="info-modal__aside">{aside}</div>}
        </div>
      </div>
    </>
  );
};

export default InfoModal;
