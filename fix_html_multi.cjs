const fs = require('fs');
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');

const oldHtml = `<div class="custom-dropdown" id="condition-filter" data-value="all">
          <div class="dropdown-header">وضعیت کالا</div>
          <div class="dropdown-list hidden">
            <div class="dropdown-item selected" data-value="all">وضعیت کالا</div>
            <div class="dropdown-item" data-value="new">فقط نو</div>
            <div class="dropdown-item" data-value="used">دست دوم</div>
          </div>
        </div>`;

const newHtml = `<div class="custom-dropdown multiple" id="condition-filter">
          <div class="dropdown-header">
            <span class="header-text">وضعیت کالا</span>
            <span class="clear-filter hidden">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </span>
          </div>
          <div class="dropdown-list hidden">
            <div class="dropdown-item checkbox-item selected" data-value="new">
              <div class="check-box">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span>نو</span>
            </div>
            <div class="dropdown-item checkbox-item selected" data-value="used">
              <div class="check-box">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span>کارکرده</span>
            </div>
          </div>
        </div>`;

html = html.replace(oldHtml, newHtml);
fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Replaced HTML with checkbox filter");
