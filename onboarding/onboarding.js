const PRODUCT_SUGGESTIONS = [
  { query: 'گوشی موبایل سامسونگ', category: 'موبایل' },
  { query: 'هدفون بلوتوثی انکر', category: 'هدفون' },
  { query: 'لپ تاپ لنوو', category: 'لپ‌تاپ' },
  { query: 'سرخ کن فیلیپس', category: 'لوازم خانه' },
];

const grid = document.getElementById('product-grid');
const status = document.getElementById('products-status');
const dismissButton = document.getElementById('dismiss-onboarding');

function createArrowIcon() {
  const namespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(namespace, 'svg');
  icon.setAttribute('viewBox', '0 0 20 20');
  icon.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(namespace, 'path');
  path.setAttribute('d', 'M16 10H4m5-5-5 5 5 5');
  icon.appendChild(path);
  return icon;
}

function createProductCard(product, category) {
  const title = product.name || product.title_fa || product.title_en || category;
  const imageUrl = product.image || product.images?.main?.url?.[0] || product.images?.list?.[0]?.url?.[0] || '';
  const productUrl = typeof product.url === 'string'
    ? product.url
    : `https://www.digikala.com${product.url?.uri || ''}`;
  const link = document.createElement('a');
  link.className = 'product-card';
  link.href = productUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.setAttribute('aria-label', `${title}؛ باز کردن محصول و امتحان پیکو`);

  const imageWrap = document.createElement('div');
  imageWrap.className = 'product-image-wrap';

  if (imageUrl) {
    const image = document.createElement('img');
    image.className = 'product-image';
    image.src = imageUrl;
    image.alt = '';
    image.width = 240;
    image.height = 210;
    image.loading = 'lazy';
    imageWrap.appendChild(image);
  }

  const content = document.createElement('div');
  content.className = 'product-content';

  const categoryLabel = document.createElement('p');
  categoryLabel.className = 'product-category';
  categoryLabel.textContent = category;

  const titleElement = document.createElement('h3');
  titleElement.className = 'product-title';
  titleElement.textContent = title;
  titleElement.title = title;

  const cta = document.createElement('span');
  cta.className = 'product-cta';
  cta.textContent = 'با پیکو امتحانش کن';
  cta.appendChild(createArrowIcon());

  content.append(categoryLabel, titleElement, cta);
  link.append(imageWrap, content);
  return link;
}

function createFallbackCard({ query, category }) {
  const link = document.createElement('a');
  link.className = 'product-card';
  link.href = `https://www.digikala.com/search/?q=${encodeURIComponent(query)}`;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.setAttribute('aria-label', `جست‌وجوی ${query} و انتخاب محصول برای امتحان پیکو`);

  const imageWrap = document.createElement('div');
  imageWrap.className = 'product-image-wrap';
  imageWrap.innerHTML = `
    <svg width="92" height="92" viewBox="0 0 92 92" fill="none" aria-hidden="true">
      <rect x="16" y="20" width="60" height="54" rx="16" fill="#E5FFF3" stroke="#0B8D58" stroke-width="3"/>
      <path d="M31 20c0-8 6-14 15-14s15 6 15 14" stroke="#0B8D58" stroke-width="3" stroke-linecap="round"/>
      <path d="M35 47h22M46 36v22" stroke="#111715" stroke-width="4" stroke-linecap="round"/>
    </svg>`;

  const content = document.createElement('div');
  content.className = 'product-content';
  const categoryLabel = document.createElement('p');
  categoryLabel.className = 'product-category';
  categoryLabel.textContent = category;
  const titleElement = document.createElement('h3');
  titleElement.className = 'product-title';
  titleElement.textContent = query;
  const cta = document.createElement('span');
  cta.className = 'product-cta';
  cta.textContent = 'انتخاب محصول';
  cta.appendChild(createArrowIcon());
  content.append(categoryLabel, titleElement, cta);
  link.append(imageWrap, content);
  return link;
}

async function loadSuggestedProducts() {
  let products = [];

  try {
    products = await new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        reject(new Error('Extension runtime is unavailable'));
        return;
      }

      chrome.runtime.sendMessage({
        type: 'GET_ONBOARDING_PRODUCTS',
        queries: PRODUCT_SUGGESTIONS.map(({ query }) => query),
      }, (response) => {
        if (chrome.runtime.lastError || !Array.isArray(response?.products)) {
          reject(new Error(chrome.runtime.lastError?.message || 'Products are unavailable'));
          return;
        }
        resolve(response.products);
      });
    });
  } catch {
    products = [];
  }

  const cards = PRODUCT_SUGGESTIONS.map((suggestion, index) => {
    const product = products[index];
    return product ? createProductCard(product, suggestion.category) : createFallbackCard(suggestion);
  });

  grid.replaceChildren(...cards);
  grid.setAttribute('aria-busy', 'false');
  status.textContent = 'چهار پیشنهاد آماده‌ست؛ یکی رو انتخاب کن تا اولین مقایسه رو انجام بدی.';
}

dismissButton.addEventListener('click', () => {
  window.close();
});

loadSuggestedProducts();
