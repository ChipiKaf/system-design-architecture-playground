import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.scss";
import Shell from "./components/Shell";
import Landing from "./components/Landing/Landing";
import { categories, findCategory, findPlugin } from "./registry";

/**
 * Wrapper that resolves /:categoryId/:pluginId params and
 * feeds the matching plugin into Shell.
 */
function PluginRoute() {
  // react-router doesn't expose useParams without a generic, so grab from URL
  const [, categoryId, pluginId] = window.location.pathname.split("/");

  const category = findCategory(categoryId);
  const plugin = findPlugin(pluginId);

  if (!category || !plugin) {
    return <Navigate to="/" replace />;
  }

  return <Shell plugin={plugin} category={category} />;
}

/**
 * Redirect bare category URLs (e.g. /system-design) to the first plugin
 * inside that category.
 */
function CategoryRedirect() {
  const [, categoryId] = window.location.pathname.split("/");
  const category = findCategory(categoryId);

  if (!category || category.plugins.length === 0) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/${category.id}/${category.plugins[0].id}`} replace />;
}

function App() {
  // Build one Route per category (for bare-category redirects)
  // and one per category/plugin pair.
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {categories.map((cat) => (
          <Route
            key={cat.id}
            path={`/${cat.id}`}
            element={<CategoryRedirect />}
          />
        ))}

        {categories.flatMap((cat) =>
          cat.plugins.map((p) => (
            <Route
              key={`${cat.id}/${p.id}`}
              path={`/${cat.id}/${p.id}`}
              element={<PluginRoute />}
            />
          )),
        )}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
