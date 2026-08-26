"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, PackageOpen, RotateCcw, Scale, Sparkles } from "lucide-react";

type Kind = "衣服" | "鞋" | "包" | "其他";
type Decision = "留下" | "转卖" | "捐赠" | "舍弃" | "观察3个月";
type Answer = { id: string; value: string };
type Item = { id: string; name: string; kind: Kind; decision: Decision; weight?: number };
type Stage = "area" | "item" | "question" | "result" | "settlement";

const STORAGE_KEY = "danshari-session-v1";
const decisions: Decision[] = ["留下", "转卖", "捐赠", "舍弃", "观察3个月"];

function nextQuestion(answers: Answer[]) {
  const has = (id: string) => answers.some((a) => a.id === id);
  const get = (id: string) => answers.find((a) => a.id === id)?.value;
  if (!has("condition")) return { id: "condition", text: "先客观看看，它现在的状态怎么样？", options: ["状态很好", "有一点使用痕迹", "已经破损、变形或无法正常使用"] };
  if (get("condition") === "已经破损、变形或无法正常使用") return null;
  if (!has("use")) return { id: "use", text: "你最近一次真正穿它或用它，是什么时候？", options: ["最近3个月", "半年到一年内", "一年多以前", "买来后从没用过"] };
  if (!has("scene")) return { id: "scene", text: "接下来几个月，有哪个明确的场合会用到它吗？", options: ["有，而且能说出具体场合", "可能会，但还不确定", "想不到会用在什么时候"] };
  if (!has("fit")) return { id: "fit", text: "现在穿上或拿起它，你的真实感觉更接近哪一种？", options: ["舒服、顺眼，愿意直接出门", "还可以，但总觉得差一点", "不舒服或会忍不住换掉"] };
  if (!has("rebuy")) return { id: "rebuy", text: "如果今天第一次在商场遇到它，你还会买下吗？", options: ["会，我现在还是喜欢", "会犹豫", "不会"] };
  return null;
}

function judge(answers: Answer[]): { decision: Decision; reason: string } {
  const get = (id: string) => answers.find((a) => a.id === id)?.value ?? "";
  if (get("condition").includes("破损")) return { decision: "舍弃", reason: "它已经结束使用周期，不需要再占你的空间。" };
  const used = get("use"); const scene = get("scene"); const fit = get("fit"); const rebuy = get("rebuy");
  if (rebuy.startsWith("会，我") && fit.startsWith("舒服") && (used === "最近3个月" || scene.startsWith("有，而且"))) return { decision: "留下", reason: "你现在仍会主动选择它，而且用起来舒服，它还属于你的生活。" };
  if ((used === "一年多以前" || used.includes("从没")) && rebuy === "不会") return { decision: "转卖", reason: "它本身还有价值，只是你已经不会再选择它了。" };
  if (fit.startsWith("不舒服") && scene.startsWith("想不到")) return { decision: "捐赠", reason: "它还能继续使用，但已经不需要留在你的生活里。" };
  if (rebuy === "不会" || fit.startsWith("不舒服") || scene.startsWith("想不到")) return { decision: "转卖", reason: "它的状态还可以，但和现在的你已经没有足够真实的联系。" };
  return { decision: "观察3个月", reason: "你对它还有真实兴趣，但证据还不够。放到最容易看到的位置，3个月内一次都没用，就直接处理。" };
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("area");
  const [area, setArea] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("衣服");
  const [weight, setWeight] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [result, setResult] = useState<{ decision: Decision; reason: string } | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { const data = JSON.parse(saved); setArea(data.area || ""); setItems(data.items || []); }
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ area, items })); }, [area, items]);

  const question = nextQuestion(answers);
  const counts = useMemo(() => Object.fromEntries(decisions.map((d) => [d, items.filter((i) => i.decision === d).length])) as Record<Decision, number>, [items]);
  const reduced = items.filter((i) => ["转卖", "捐赠", "舍弃"].includes(i.decision)).reduce((n, i) => n + (i.weight || 0), 0);

  function answer(value: string) {
    if (!question) return;
    const updated = [...answers, { id: question.id, value }];
    setAnswers(updated);
    const upcoming = nextQuestion(updated);
    if (!upcoming) finish(updated);
  }
  function finish(finalAnswers: Answer[]) {
    const judged = judge(finalAnswers); setResult(judged);
    setItems((old) => [...old, { id: crypto.randomUUID(), name: name.trim() || `${kind}一件`, kind, decision: judged.decision, weight: weight ? Number(weight) : undefined }]);
    setStage("result");
  }
  function nextItem() { setName(""); setWeight(""); setAnswers([]); setResult(null); setShowHint(false); setStage("item"); }
  function resetSession() { setArea(""); setItems([]); setName(""); setAnswers([]); setResult(null); setStage("area"); }

  return <main className="app-shell">
    <header><div className="brand"><span>舍</span><div><b>断舍离整理教练</b><small>温柔地做一个清楚的决定</small></div></div>{area && <button className="quiet" onClick={() => setStage("settlement")}><PackageOpen size={17}/>本次进度 <i>{items.length}</i></button>}</header>
    <section className="workspace">
      <div className="context"><p>当前整理区域</p><strong>{area || "还未选择"}</strong>{area && <button onClick={() => setStage("area")}>更换</button>}</div>
      <article className="coach">
        {stage === "area" && <div className="content intro-card"><p className="kicker">我们先从一个小地方开始</p><h1>今天只整理一个容器，<br/>不碰整个房间。</h1><p className="lead">选一个一眼能看完的小范围，比如一层衣柜、一个抽屉、一个收纳箱。</p><label>今天想整理哪里？<input autoFocus value={area} onChange={(e) => setArea(e.target.value)} placeholder="例如：衣柜左边第二层" onKeyDown={(e) => e.key === "Enter" && area.trim() && setStage("item")}/></label><button className="primary" disabled={!area.trim()} onClick={() => setStage("item")}>就从这里开始 <ChevronRight size={18}/></button></div>}
        {stage === "item" && <div className="content"><button className="back" onClick={() => setStage("area")}><ArrowLeft size={16}/>返回</button><p className="kicker">一次只看一件</p><h1>你现在拿起的是哪件东西？</h1><p className="lead">简单描述就好，不需要想得很完整。</p><label>物品名称或描述<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：米色长风衣"/></label><div className="kind-row">{(["衣服","鞋","包","其他"] as Kind[]).map((k) => <button className={kind === k ? "active" : ""} key={k} onClick={() => setKind(k)}>{k}</button>)}</div><label className="optional">重量（斤）<small>选填</small><input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="不知道可以不填"/></label><button className="primary" disabled={!name.trim()} onClick={() => setStage("question")}>请教练帮我判断 <ChevronRight size={18}/></button><button className="settle-link" onClick={() => setStage("settlement")}>先结算这一次</button></div>}
        {stage === "question" && question && <div className="content question-card"><button className="back" onClick={() => { if (answers.length) setAnswers(answers.slice(0,-1)); else setStage("item"); }}><ArrowLeft size={16}/>上一步</button><div className="item-chip">{kind} · {name}</div><p className="coach-says">教练想问你</p><h2>{question.text}</h2><div className="options">{question.options.map((o) => <button key={o} onClick={() => answer(o)}><span>{o}</span><ChevronRight size={18}/></button>)}</div>{answers.some((a) => a.id === "use" && a.value.includes("从没")) && !showHint && <button className="soft-link" onClick={() => setShowHint(true)}>“一次没用，处理掉很浪费……”</button>}{showHint && <p className="gentle-note">没用过本身不代表该扔。我们正在看看，是没遇到机会，还是你其实从来没真正想用它。</p>}</div>}
        {stage === "result" && result && <div className="content result-card"><div className="result-icon"><Check size={26}/></div><p className="kicker">教练的决定</p><h1>{result.decision}。</h1><p className="verdict">{result.reason}</p><div className="result-actions"><button className="primary" onClick={nextItem}>继续下一件 <ChevronRight size={18}/></button><button className="secondary" onClick={() => setStage("settlement")}>查看本次进度</button></div></div>}
        {stage === "settlement" && <div className="content settlement"><button className="back" onClick={() => setStage(items.length ? "item" : "area")}><ArrowLeft size={16}/>继续整理</button><p className="kicker">本次整理</p><h1>{area || "这个小区域"}</h1><div className="total"><span>已经判断</span><strong>{items.length}<small>件</small></strong></div><div className="count-grid">{decisions.map((d) => <div key={d}><span>{d === "观察3个月" ? "观察" : d}</span><b>{counts[d]}</b></div>)}</div>{reduced > 0 && <div className="weight-total"><Scale size={19}/><span>已减少约</span><b>{reduced.toFixed(1).replace(".0","")} 斤</b></div>}<div className="log">{items.slice().reverse().map((i) => <div key={i.id}><span><b>{i.name}</b><small>{i.kind}{i.weight ? ` · ${i.weight}斤` : ""}</small></span><em>{i.decision}</em></div>)}</div><p className="closing">这一轮已经让 {items.length} 件东西有了明确去处。</p><button className="secondary danger" onClick={resetSession}><RotateCcw size={16}/>开始新的整理会话</button></div>}
      </article>
      <aside><Sparkles size={18}/><p>不用一次整理完。<br/>只看当前这个区域、当前这一件。</p></aside>
    </section>
  </main>;
}
