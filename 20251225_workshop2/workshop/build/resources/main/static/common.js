// 公共工具（你负责维护）
// 目标：让学员把精力放在“同步/异步的实现与取舍”，而不是重复写样板代码。

export const API_BASE = "http://localhost:8080";

export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

export function formatJPY(n){
  try{ return new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n); }
  catch(e){ return "¥" + (n ?? 0); }
}

export function toast(message, type="info"){
  // 超轻量 toast：不依赖第三方库
  const wrap = document.createElement("div");
  wrap.className = "toast align-items-center text-bg-" + type + " border-0 position-fixed bottom-0 end-0 m-3";
  wrap.role = "alert";
  wrap.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  document.body.appendChild(wrap);
  const t = new bootstrap.Toast(wrap, { delay: 2500 });
  t.show();
  wrap.addEventListener("hidden.bs.toast", () => wrap.remove());
}
