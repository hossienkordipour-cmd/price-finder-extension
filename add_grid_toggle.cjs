const fs = require('fs');

// 1. Add Event Listener to JS
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const toggleCode = `
document.querySelector(".grid-icon-btn").addEventListener("click", () => {
  resultsListEl.classList.toggle("grid-view");
});
`;

if (!js.includes('.grid-icon-btn')) {
  js = js + '\n' + toggleCode;
  fs.writeFileSync('sidebar/sidebar.js', js);
  console.log("Added grid toggle JS");
}

// 2. Add CSS rules
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');
const gridCss = `
/* --- Grid View Layout --- */
.results-list.grid-view {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.results-list.grid-view .result-card {
  flex-direction: column;
  padding: 8px; /* Tighter padding for grid */
  gap: 8px;     /* Distance from image to text */
  align-items: stretch;
}

.results-list.grid-view .card-image-wrapper {
  width: 100%;
  height: 140px; 
  border-radius: 8px;
}

.results-list.grid-view .card-content {
  padding-top: 0;
  justify-content: flex-start;
}

/* Store name moves above title */
.results-list.grid-view .card-store {
  order: 1;
  font-size: 10px;
  margin-bottom: 2px; /* Distance to title */
  text-align: right;
}

/* Title is 2 lines */
.results-list.grid-view .card-title {
  order: 2;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px; /* Distance to price */
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.6;
}

/* Price area */
.results-list.grid-view .card-bottom {
  order: 3;
  margin-top: auto;
  justify-content: flex-end; /* Price on the right */
}

.results-list.grid-view .card-price {
  font-size: 14px;
}

.results-list.grid-view .card-price span {
  font-size: 10px;
}

.results-list.grid-view .card-discount {
  display: none; /* Hide in grid view to keep it clean */
}

/* Skeleton adjustments for grid view */
.results-list.grid-view .skeleton-card {
  flex-direction: column;
  padding: 8px;
  gap: 8px;
  align-items: stretch;
}
.results-list.grid-view .skeleton-img {
  width: 100%;
  height: 140px;
}
.results-list.grid-view .skeleton-content {
  margin-left: 0;
}
`;

if (!css.includes('.results-list.grid-view')) {
  css = css + '\n' + gridCss;
  fs.writeFileSync('sidebar/sidebar.css', css);
  console.log("Added grid CSS");
}

