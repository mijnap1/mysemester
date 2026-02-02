(() => {
  const listEl = document.getElementById("scaleList");
  const searchEl = document.getElementById("scaleSearch");
  const data = Array.isArray(window.GPA_SCALES) ? window.GPA_SCALES.slice() : [];

  if (!listEl || data.length === 0) return;

  const scaleTagMeta = {
    "4.0": { label: "4.0", className: "four" },
    "4.33": { label: "4.33", className: "fourthree" },
    "4.3": { label: "4.3", className: "fourthree" },
    "9-point": { label: "9-point", className: "ten" },
    "10-point": { label: "10-point", className: "ten" },
    "12-point": { label: "12-point", className: "twelve" },
    "Percent": { label: "Percent", className: "pct" }
  };

  function hasPercent(mappings) {
    return mappings.some((m) => m.percent);
  }

  function hasPoints(mappings) {
    return mappings.some((m) => m.points);
  }

  function buildTag(label, className) {
    const span = document.createElement("span");
    span.className = `scale-tag ${className || ""}`.trim();
    span.textContent = label;
    return span;
  }

  function render(items) {
    listEl.innerHTML = "";
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "scale-card";
      empty.textContent = "No universities match that search.";
      listEl.appendChild(empty);
      return;
    }

    items.forEach((uni) => {
      const card = document.createElement("div");
      card.className = "scale-card";

      const head = document.createElement("div");
      head.className = "scale-head";

      const title = document.createElement("div");
      title.className = "scale-title";
      const h3 = document.createElement("h3");
      h3.textContent = uni.name;
      const meta = document.createElement("span");
      meta.textContent = uni.province || "";
      title.appendChild(h3);
      title.appendChild(meta);

      const tags = document.createElement("div");
      tags.className = "scale-tags";
      const scaleMeta = scaleTagMeta[uni.scaleType] || scaleTagMeta["Percent"];
      if (scaleMeta) tags.appendChild(buildTag(scaleMeta.label, scaleMeta.className));

      const hasPct = hasPercent(uni.mappings || []);
      const hasPts = hasPoints(uni.mappings || []);
      if (hasPct && !hasPts) tags.appendChild(buildTag("Percent only", "pct"));
      if (hasPts && !hasPct) tags.appendChild(buildTag("Points only", "four"));

      head.appendChild(title);
      head.appendChild(tags);

      const table = document.createElement("div");
      table.className = "scale-table";

      const columns = [{ label: "Letter", key: "letter" }];
      if (hasPct) columns.push({ label: "Percent", key: "percent" });
      if (hasPts) columns.push({ label: "Points", key: "points" });

      columns.forEach((col) => {
        const colEl = document.createElement("div");
        colEl.className = "scale-col";
        const h4 = document.createElement("h4");
        h4.textContent = col.label;
        const ul = document.createElement("ul");
        (uni.mappings || []).forEach((m) => {
          const li = document.createElement("li");
          const label = document.createElement("span");
          label.className = "label";
          label.textContent = m.letter || "—";
          const value = document.createElement("span");
          value.className = "value";
          value.textContent = m[col.key] || "—";
          li.appendChild(label);
          li.appendChild(value);
          ul.appendChild(li);
        });
        colEl.appendChild(h4);
        colEl.appendChild(ul);
        table.appendChild(colEl);
      });

      const links = document.createElement("div");
      links.className = "scale-links";
      if (uni.sourceUrl) {
        const a = document.createElement("a");
        a.href = uni.sourceUrl;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "Official policy";
        links.appendChild(a);
      }
      if (uni.note) {
        const note = document.createElement("span");
        note.className = "scale-note";
        note.textContent = uni.note;
        links.appendChild(note);
      }

      card.appendChild(head);
      card.appendChild(table);
      card.appendChild(links);
      listEl.appendChild(card);
    });
  }

  data.sort((a, b) => {
    const prov = (a.province || "").localeCompare(b.province || "");
    if (prov !== 0) return prov;
    return (a.name || "").localeCompare(b.name || "");
  });

  render(data);

  if (searchEl) {
    searchEl.addEventListener("input", () => {
      const term = searchEl.value.trim().toLowerCase();
      if (!term) {
        render(data);
        return;
      }
      const filtered = data.filter((uni) => {
        const hay = `${uni.name} ${uni.province} ${uni.scaleType}`.toLowerCase();
        return hay.includes(term);
      });
      render(filtered);
    });
  }
})();
