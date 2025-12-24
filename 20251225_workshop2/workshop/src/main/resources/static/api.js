// API 调用层（你负责一部分，学员也可以在此扩展）
import { API_BASE } from "./common.js";

// 统一处理：把非 2xx 转成 throw，便于 async/await 捕获
async function httpJson(path, options={}){
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json", ...(options.headers||{}) },
    ...options
  });
  if(!res.ok){
    const text = await res.text().catch(()=> "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function searchOrders(params){
  // params: {orderId, user, status, dateFrom, dateTo, page, size}
  const q = new URLSearchParams();
  Object.entries(params||{}).forEach(([k,v])=>{
    if(v !== undefined && v !== null && String(v).trim() !== "") q.set(k, v);
  });
  return httpJson("/api/orders?" + q.toString());
}

export async function getOrder(id){
  return httpJson("/api/orders/" + encodeURIComponent(id));
}

export async function createOrder(payload){
  return httpJson("/api/orders", { method:"POST", body: JSON.stringify(payload) });
}

// 用于演示延迟/超时/取消
export async function sleep(ms){
  return httpJson("/api/sleep?ms=" + encodeURIComponent(ms));
}
