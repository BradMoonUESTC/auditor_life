/** DOM helpers */
export const $ = (sel) => /** @type {HTMLElement|null} */ (document.querySelector(sel));
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

