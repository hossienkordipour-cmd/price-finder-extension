import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const tutorialRoot = fileURLToPath(new URL('../tutorial/',import.meta.url));
const sidebarRoot = fileURLToPath(new URL('../sidebar/',import.meta.url));
export const tutorialFiles = new Map([
  ['index.html',path.join(tutorialRoot,'index.html')],
  ['styles.css',path.join(tutorialRoot,'styles.css')],
  ['app.js',path.join(tutorialRoot,'app.js')],
  ['assets/headphones.svg',path.join(tutorialRoot,'assets/headphones.svg')],
  ['assets/airpods-pro.jpg',path.join(tutorialRoot,'assets/airpods-pro.jpg')],
  ['assets/PHOTO-LICENSE.txt',path.join(tutorialRoot,'assets/PHOTO-LICENSE.txt')],
  ['assets/logo.png',path.join(sidebarRoot,'primary-logo.png')],
  ['assets/character.png',path.join(sidebarRoot,'assets/logo-character.png')],
  ...['Regular','SemiBold','ExtraBold'].map(weight => [`assets/YekanBakhFaNum-${weight}.woff2`,path.join(sidebarRoot,`YekanBakhFaNum-${weight}.woff2`)]),
]);
