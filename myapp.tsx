import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/**
 * 日历 + 记账 一体化组件（支持在线同步｜Vercel 可部署｜不使用浏览器本地持久化保存业务数据）
 * ---------------------------------------------------------
 * 要求：
 *  - 快捷事件（模板）可自定义方框/标签颜色
 *  - 新增后的事件可删改且可更改标签颜色
 *  - 在线同步（Supabase 免费层：Postgres + Auth + 行级安全）；Vercel 发布
 *  - 可扩展：支持金额、每日汇总、月度汇总、按标签统计
 *  - 美化：Tailwind UI 风格 + 轻动画
 *
 * 使用方法（部署）：
 * 1) 新建 Supabase 项目：获得 URL 与 anon key；创建以下表结构并启用 RLS（文件末尾提供 SQL）
 * 2) 在 Vercel 新建 Next.js 工程，把本组件作为页面使用；在 Vercel 的 Project Settings → Environment Variables 设置：
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 3) 首次打开页面，使用 GitHub/Google 登录（OAuth 回调域名在 Supabase Auth 设置中加入你的 Vercel 域名）
 * 4) 登录后即可云端同步数据。
 *
 * 备注：本组件不会使用 localStorage 持久化业务数据；仅依赖 Supabase SDK 自身的会话管理。
 */

// 读取环境变量（Next.js/Vite 均可；Vite 用 import.meta.env）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || import.meta?.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta?.env?.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("⚠️ 缺少 Supabase 环境变量。请在 Vercel 环境变量中设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY。");
}

const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "");

// 一些小工具
const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#14B8A6", "#F97316", "#6366F1",
  "#22C55E", "#E11D48", "#0EA5E9", "#A855F7"
];

const TagDot = ({ color }) => (
  <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle" style={{ background: color }} />
);

const Button = ({ className = "", children, ...rest }) => (
  <button
    className={`px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 active:scale-[0.99] transition ${className}`}
    {...rest}
  >{children}</button>
);

const PrimaryButton = ({ className = "", children, ...rest }) => (
  <button
    className={`px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition ${className}`}
    {...rest}
  >{children}</button>
);

export default function CalendarMoneyApp() {
  const [user, setUser] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [current, setCurrent] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  // 数据
  const [tags, setTags] = useState([]); // {id, user_id, name, color}
  const [templates, setTemplates] = useState([]); // 快捷按钮 = tag 的一组快捷（亦可直接用 tags）
  const [events, setEvents] = useState([]); // {id, user_id, date, title, amount, tag_id}

  const selectedStr = useMemo(() => fmtDate(selected), [selected]);

  // ---------------- Auth ----------------
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setProfileLoaded(true);
    };
    getSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInOAuth = async (provider) => {
    await supabase.auth.signInWithOAuth({ provider });
  };
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // ---------------- Cloud data load ----------------
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [tagRes, tplRes, evRes] = await Promise.all([
        supabase.from("tags").select("id,name,color").order("created_at", { ascending: true }),
        supabase.from("templates").select("id,name,color,tag_id").order("created_at", { ascending: true }),
        supabase.from("events").select("id,date,title,amount,tag_id,created_at").gte("date", firstDay(current)).lte("date", lastDay(current)).order("created_at", { ascending: false })
      ]);
      if (!tagRes.error) setTags(tagRes.data || []);
      if (!tplRes.error) setTemplates(tplRes.data || []);
      if (!evRes.error) setEvents(evRes.data || []);
    })();
  }, [user, current]);

  // 工具：当月首尾（YYYY-MM-DD）
  const firstDay = (d) => {
    const t = new Date(d.getFullYear(), d.getMonth(), 1);
    return fmtDate(t);
  };
  const lastDay = (d) => {
    const t = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return fmtDate(t);
  };

  // 计算：某日、某月统计
  const eventsByDate = useMemo(() => {
    const m = new Map();
    for (const e of events) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date).push(e);
    }
    return m;
  }, [events]);

  const sumByDate = (dateStr) => {
    const arr = eventsByDate.get(dateStr) || [];
    return arr.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  };

  const monthTotal = useMemo(() => {
    return events.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }, [events]);

  const tagMap = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags]);

  // ------------- CRUD: Tag / Template / Event -------------
  const createTag = async (name, color) => {
    const { data, error } = await supabase.from("tags").insert({ name, color }).select().single();
    if (!error) setTags((x) => [...x, data]);
  };
  const updateTagColor = async (tagId, color) => {
    const { error } = await supabase.from("tags").update({ color }).eq("id", tagId);
    if (!error) setTags((xs) => xs.map(t => t.id === tagId ? { ...t, color } : t));
  };
  const removeTag = async (tagId) => {
    await supabase.from("tags").delete().eq("id", tagId);
    setTags((xs) => xs.filter(t => t.id !== tagId));
  };

  const createTemplate = async (name, color, tagId = null) => {
    const { data, error } = await supabase.from("templates").insert({ name, color, tag_id: tagId }).select().single();
    if (!error) setTemplates((x) => [...x, data]);
  };
  const removeTemplate = async (id) => {
    await supabase.from("templates").delete().eq("id", id);
    setTemplates((xs) => xs.filter(t => t.id !== id));
  };

  const addEvent = async ({ date, title, amount = 0, tag_id = null }) => {
    const { data, error } = await supabase.from("events").insert({ date, title, amount, tag_id }).select().single();
    if (!error) setEvents((x) => [data, ...x]);
  };
  const updateEvent = async (id, patch) => {
    const { data, error } = await supabase.from("events").update(patch).eq("id", id).select().single();
    if (!error) setEvents((xs) => xs.map(e => e.id === id ? data : e));
  };
  const removeEvent = async (id) => {
    await supabase.from("events").delete().eq("id", id);
    setEvents((xs) => xs.filter(e => e.id !== id));
  };

  // ------------- UI：日历生成 -------------
  const renderCalendarCells = () => {
    const year = current.getFullYear();
    const month = current.getMonth();
    const first = new Date(year, month, 1);
    const startWeek = (first.getDay() + 6) % 7; // 以周一为 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];

    for (let i = 0; i < startWeek; i++) {
      cells.push(<div key={`pad-${i}`} className="border border-gray-200 bg-gray-50 min-h-[110px]" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = fmtDate(new Date(year, month, d));
      const list = eventsByDate.get(dateStr) || [];
      const isToday = fmtDate(new Date()) === dateStr;
      const isSelected = fmtDate(selected) === dateStr;

      cells.push(
        <div
          key={dateStr}
          onClick={() => setSelected(new Date(year, month, d))}
          className={`relative border border-gray-200 p-2 min-h-[110px] cursor-pointer hover:bg-blue-50/40 transition ${isSelected ? "bg-blue-50" : ""}`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className={`text-sm font-medium ${isToday ? "text-blue-700" : "text-gray-700"}`}>{d}</div>
            {sumByDate(dateStr) > 0 && (
              <div title="当日支出" className="text-xs font-semibold">￥{sumByDate(dateStr).toFixed(0)}</div>
            )}
          </div>

          <div className="space-y-1">
            {list.slice(0, 3).map((e) => (
              <div
                key={e.id}
                title={e.title}
                onClick={(ev) => { ev.stopPropagation(); setEditing(e); setForm({ title: e.title, amount: e.amount ?? 0, tag_id: e.tag_id ?? null }); }}
                className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:shadow-sm flex items-center gap-1 truncate"
              >
                {e.tag_id && <TagDot color={tagMap[e.tag_id]?.color || "#999"} />}
                <span className="truncate">{e.title}</span>
                {e.amount ? <span className="ml-auto opacity-70">￥{Number(e.amount).toFixed(0)}</span> : null}
              </div>
            ))}
            {list.length > 3 && <div className="text-[11px] text-gray-500 italic">+{list.length - 3} 更多…</div>}
          </div>
        </div>
      );
    }
    return cells;
  };

  // ------------- 表单：新增/编辑事件 -------------
  const emptyForm = { title: "", amount: "", tag_id: null };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null); // 当前编辑的事件

  const submitNew = async () => {
    if (!form.title.trim()) return;
    await addEvent({ date: selectedStr, title: form.title.trim(), amount: Number(form.amount) || 0, tag_id: form.tag_id });
    setForm(emptyForm);
  };

  const submitEdit = async () => {
    if (!editing) return;
    await updateEvent(editing.id, { title: form.title.trim(), amount: Number(form.amount) || 0, tag_id: form.tag_id });
    setEditing(null);
  };

  // ------------- 快捷模板（点击即添加事件；长按删除；支持自定义颜色） -------------
  const [tplName, setTplName] = useState("");
  const [tplColor, setTplColor] = useState(COLORS[0]);
  const [tplBindTagId, setTplBindTagId] = useState(null);

  const addByTemplate = async (tpl) => {
    await addEvent({ date: selectedStr, title: tpl.name, amount: 0, tag_id: tpl.tag_id });
  };

  // ------------- 标签管理 -------------
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(COLORS[1]);

  // ------------- 统计（本月） -------------
  const statsByTag = useMemo(() => {
    const m = new Map();
    for (const e of events) {
      const key = e.tag_id || "__none";
      const val = Number(e.amount) || 0;
      m.set(key, (m.get(key) || 0) + val);
    }
    const arr = Array.from(m.entries()).map(([k, v]) => ({ tag_id: k, total: v }));
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [events]);

  // ------------------- 渲染 -------------------
  if (!profileLoaded) {
    return <div className="p-6 text-gray-600">初始化中…</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-2">每日生活记录 · 同步版</h1>
          <p className="text-gray-500 mb-6">使用你的账号登录以启用云端同步（不使用浏览器本地缓存保存数据）。</p>
          <div className="space-y-3">
            <PrimaryButton className="w-full" onClick={() => signInOAuth("github")}>使用 GitHub 登录</PrimaryButton>
            <PrimaryButton className="w-full" onClick={() => signInOAuth("google")}>使用 Google 登录</PrimaryButton>
          </div>
          <p className="text-xs text-gray-400 mt-6">登录即表示同意云端存储你的记录（仅你可见，行级安全保护）。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-2xl font-bold">每日生活记录</div>
            <div className="text-gray-500">记录今天做了什么 & 每日消费统计 · 云端同步</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">{user.email || user.user_metadata?.full_name}</div>
            <Button onClick={signOut}>退出</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 日历面板 */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow p-4">
            {/* 月份导航 */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-semibold">{current.getFullYear()}年 {current.getMonth() + 1}月</div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))}>上月</Button>
                <PrimaryButton onClick={() => { const t = new Date(); setCurrent(new Date(t.getFullYear(), t.getMonth(), 1)); setSelected(t); }}>今天</PrimaryButton>
                <Button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))}>下月</Button>
              </div>
            </div>
            {/* 星期标题 */}
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
              {['一','二','三','四','五','六','日'].map((w) => <div key={w}>周{w}</div>)}
            </div>
            {/* 日历格子 */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendarCells()}
            </div>
          </div>

          {/* 右侧：表单/列表/模板/标签/统计 */}
          <div className="space-y-4">
            {/* 选中日期 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="text-sm text-gray-500">已选日期</div>
              <div className="text-lg font-semibold">{selectedStr}</div>
              <div className="text-sm text-gray-500">当日总支出：<span className="font-semibold text-gray-800">￥{sumByDate(selectedStr).toFixed(0)}</span></div>
            </div>

            {/* 新增事件 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="font-semibold mb-3">新增事件</div>
              <div className="space-y-3">
                <input
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="事件内容（如：健身/买咖啡/学习1h）"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="金额（￥，可选）"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                  <select
                    className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none"
                    value={form.tag_id || ""}
                    onChange={(e) => setForm((f) => ({ ...f, tag_id: e.target.value || null }))}
                  >
                    <option value="">无标签</option>
                    {tags.map(t => (
                      <option key={t.id} value={t.id}>[{t.name}]</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <PrimaryButton onClick={submitNew}>添加</PrimaryButton>
                  {editing && (
                    <>
                      <PrimaryButton onClick={submitEdit}>保存修改</PrimaryButton>
                      <Button onClick={() => { setEditing(null); setForm(emptyForm); }}>取消编辑</Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 当天事件列表 */}
            <div className="bg-white rounded-2xl shadow p-4 max-h-[340px] overflow-auto">
              <div className="font-semibold mb-3">当天事件</div>
              <div className="space-y-2">
                {(eventsByDate.get(selectedStr) || []).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at)).map(e => (
                  <div key={e.id} className="flex items-center gap-2 p-2 border rounded-lg">
                    {e.tag_id && <TagDot color={tagMap[e.tag_id]?.color || "#999"} />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{e.title}</div>
                      <div className="text-[11px] text-gray-500">{new Date(e.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                    </div>
                    {e.amount ? <div className="text-sm font-semibold">￥{Number(e.amount).toFixed(0)}</div> : null}
                    <Button onClick={() => { setEditing(e); setForm({ title: e.title, amount: e.amount ?? 0, tag_id: e.tag_id ?? null }); }}>编辑</Button>
                    <Button className="text-red-600" onClick={() => removeEvent(e.id)}>删除</Button>
                  </div>
                ))}
                {!(eventsByDate.get(selectedStr) || []).length && (
                  <div className="text-sm text-gray-500">今天还没有事件～</div>
                )}
              </div>
            </div>

            {/* 快捷事件（模板） */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="font-semibold mb-3">快捷事件</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    title="点击添加；长按删除"
                    onClick={() => addByTemplate(tpl)}
                    onMouseDown={(e) => {
                      const target = e.currentTarget; target._pressTimer = setTimeout(() => removeTemplate(tpl.id), 800);
                    }}
                    onMouseUp={(e) => clearTimeout(e.currentTarget._pressTimer)}
                    onMouseLeave={(e) => clearTimeout(e.currentTarget._pressTimer)}
                    className="px-3 py-1.5 rounded-full border text-sm hover:shadow-sm"
                    style={{ background: `${tpl.color}20`, borderColor: `${tpl.color}55`, color: tpl.color }}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2 items-center">
                <input
                  className="col-span-2 px-3 py-2 rounded-lg border border-gray-200"
                  placeholder="模板名称"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                />
                <select
                  className="px-3 py-2 rounded-lg border border-gray-200"
                  value={tplBindTagId || ""}
                  onChange={(e) => setTplBindTagId(e.target.value || null)}
                >
                  <option value="">绑定标签（可选）</option>
                  {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input type="color" className="w-full h-10" value={tplColor} onChange={(e) => setTplColor(e.target.value)} />
                <PrimaryButton onClick={() => { if (!tplName.trim()) return; createTemplate(tplName.trim(), tplColor, tplBindTagId); setTplName(""); }}>添加</PrimaryButton>
              </div>
            </div>

            {/* 标签管理 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="font-semibold mb-3">标签管理（用于事件颜色）</div>
              <div className="space-y-2 mb-3">
                {tags.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <TagDot color={t.color} />
                    <div className="flex-1">{t.name}</div>
                    <input type="color" value={t.color} onChange={(e) => updateTagColor(t.id, e.target.value)} />
                    <Button className="text-red-600" onClick={() => removeTag(t.id)}>删除</Button>
                  </div>
                ))}
                {!tags.length && <div className="text-sm text-gray-500">暂无标签～ 下面添加一个吧</div>}
              </div>
              <div className="grid grid-cols-5 gap-2 items-center">
                <input
                  className="col-span-3 px-3 py-2 rounded-lg border border-gray-200"
                  placeholder="标签名称（如：餐饮/交通/运动）"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                />
                <input type="color" className="w-full h-10" value={tagColor} onChange={(e) => setTagColor(e.target.value)} />
                <PrimaryButton onClick={() => { if (!tagName.trim()) return; createTag(tagName.trim(), tagColor); setTagName(""); }}>添加</PrimaryButton>
              </div>
            </div>

            {/* 本月统计 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="font-semibold mb-2">本月统计</div>
              <div className="text-sm text-gray-600 mb-2">本月合计：<span className="font-semibold">￥{monthTotal.toFixed(0)}</span></div>
              <div className="space-y-2">
                {statsByTag.map(s => (
                  <div key={s.tag_id} className="flex items-center gap-2">
                    <TagDot color={tagMap[s.tag_id]?.color || "#999"} />
                    <div className="flex-1 text-sm">{s.tag_id === "__none" ? "未分类" : (tagMap[s.tag_id]?.name || "标签已删")}</div>
                    <div className="text-sm font-semibold">￥{s.total.toFixed(0)}</div>
                  </div>
                ))}
                {!statsByTag.length && <div className="text-sm text-gray-500">暂无数据</div>}
              </div>
            </div>
          </div>
        </div>

        {/* 底部小贴士 */}
        <div className="text-center text-xs text-gray-400 mt-6">数据存于云端（Supabase，启用 RLS），支持多设备同步 · Vercel 可发布</div>
      </div>
    </div>
  );
}


