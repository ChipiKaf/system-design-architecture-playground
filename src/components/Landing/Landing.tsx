import React from "react";
import { useNavigate } from "react-router-dom";
import { categories } from "../../registry";
import "./Landing.scss";

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const handlePickCategory = (categoryId: string, firstPluginId: string) => {
    navigate(`/${categoryId}/${firstPluginId}`);
  };

  return (
    <div className="landing">
      <div className="landing__header">
        <h1 className="landing__title">VizCraft Playground</h1>
        <p className="landing__subtitle">
          Pick a topic to explore interactive visualizations of system design
          concepts, architecture patterns, and more.
        </p>
      </div>

      <div className="landing__grid">
        {categories.map((cat) => {
          const firstPlugin = cat.plugins[0];
          if (!firstPlugin) return null;

          return (
            <div
              key={cat.id}
              className="landing__card"
              style={{ borderColor: cat.accent }}
              onClick={() => handlePickCategory(cat.id, firstPlugin.id)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = cat.accent;
              }}
            >
              <h2 className="landing__card-name" style={{ color: cat.accent }}>
                {cat.name}
              </h2>
              <p className="landing__card-desc">{cat.description}</p>
              <span className="landing__card-count">
                <span
                  className="landing__dot"
                  style={{ background: cat.accent }}
                />
                {cat.plugins.length} demo{cat.plugins.length !== 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Landing;
