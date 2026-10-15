let tickets = [
  {id:"TK-1048", title:"Charged twice for my subscription", category:"Billing", priority:"Urgent", sentiment:"Negative", status:"Open", updated:"12 min ago"},
  {id:"TK-1047", title:"Can’t export monthly report", category:"Technical", priority:"High", sentiment:"Neutral", status:"In progress", updated:"34 min ago"},
  {id:"TK-1046", title:"Update the email on my account", category:"Account", priority:"Medium", sentiment:"Positive", status:"Open", updated:"1 hr ago"},
  {id:"TK-1045", title:"Feature request: dark mode", category:"Product feedback", priority:"Low", sentiment:"Positive", status:"Open", updated:"2 hrs ago"},
  {id:"TK-1044", title:"Login page keeps timing out", category:"Technical", priority:"High", sentiment:"Negative", status:"Resolved", updated:"3 hrs ago"}
];
const API_URL = window.SUPPORTIQ_API_URL || "";
const body = document.querySelector("#ticket-body");
const esc = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const normalizeTicket = ticket => ({
  ...ticket,
  title: ticket.title || (ticket.message || "New support request").split(/\r?\n/)[0].slice(0, 60),
  category: ticket.category || "Needs review",
  priority: ticket.priority || "Medium",
  sentiment: ticket.sentiment || "Neutral",
  status: ticket.status || "Open",
  updated: ticket.updated || "Just now"
});
const loadTickets = async () => {
  if (!API_URL) return;
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Ticket API returned ${response.status}`);
    const remoteTickets = await response.json();
    if (!Array.isArray(remoteTickets)) throw new Error("Ticket API returned an invalid list");
    tickets = remoteTickets.map(normalizeTicket);
    renderTickets();
  } catch (error) {
    console.error("SupportIQ could not load tickets:", error);
    showToast("Using demo tickets", "The ticket API could not be reached.");
  }
};
function renderTickets() {
  const query = document.querySelector("#ticket-search").value.toLowerCase();
  const status = document.querySelector("#status-filter").value;
  const priority = document.querySelector("#priority-filter").value;
  const sentiment = document.querySelector("#sentiment-filter").value;
  const result = tickets.filter(t => (!query || `${t.title} ${t.id} ${t.category}`.toLowerCase().includes(query)) && (status === "all" || t.status === status) && (priority === "all" || t.priority === priority) && (sentiment === "all" || t.sentiment === sentiment));
  body.innerHTML = result.map(t => `<tr><td><div class="ticket-title">${esc(t.title)}</div><div class="ticket-id">${t.id}</div></td><td>${esc(t.category)}</td><td><span class="badge priority-${t.priority.toLowerCase()}">${t.priority}</span></td><td class="sentiment-${t.sentiment.toLowerCase()}">${t.sentiment === "Negative" ? "↘ " : t.sentiment === "Positive" ? "↗ " : "→ "}${t.sentiment}</td><td><span class="status status-${t.status.toLowerCase().replace(" ","-")}">${t.status}</span></td><td>${t.updated}</td><td><button class="row-menu">•••</button></td></tr>`).join("") || `<tr><td colspan="7" class="empty-state">No tickets match these filters.</td></tr>`;
  document.querySelector("#ticket-summary").textContent = `Showing ${result.length} of ${tickets.length} tickets`;
}
renderTickets();
loadTickets();
["ticket-search","status-filter","priority-filter","sentiment-filter"].forEach(id => document.getElementById(id).addEventListener("input", renderTickets));
document.querySelector("#filter-toggle").addEventListener("click", () => document.querySelector("#filters").classList.toggle("visible"));
document.querySelector("#clear-filters").addEventListener("click", () => { ["status-filter","priority-filter","sentiment-filter"].forEach(id => document.getElementById(id).value = "all"); document.querySelector("#ticket-search").value = ""; renderTickets(); });
const modal = document.querySelector("#ticket-modal");
const form = document.querySelector("#ticket-form");
document.querySelector("#new-ticket-btn").addEventListener("click", () => { modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); });
document.querySelector("#close-modal").addEventListener("click", closeModal);
modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
function closeModal() { modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); form.style.display = ""; document.querySelector("#processing").classList.remove("active"); document.querySelector("#success-result").classList.remove("active"); }
function classify(text) {
  const lower = text.toLowerCase();
  const billing = /charg|bill|refund|payment|invoice|subscription|price/.test(lower);
  const technical = /error|bug|broken|fail|login|slow|export|crash|not work/.test(lower);
  const account = /account|email|password|profile|sign in/.test(lower);
  const negative = /angry|urgent|terrible|frustrat|can't|cannot|charged twice|broken|fail|not work|disappointed/.test(lower);
  const category = billing ? "Billing" : technical ? "Technical" : account ? "Account" : "Product feedback";
  const priority = /urgent|asap|immediately|charged twice|down/.test(lower) ? "Urgent" : negative ? "High" : category === "Product feedback" ? "Low" : "Medium";
  const sentiment = negative ? "Negative" : /great|thanks|love|helpful/.test(lower) ? "Positive" : "Neutral";
  return {category, priority, sentiment};
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  form.style.display = "none"; document.querySelector("#processing").classList.add("active");
  const text = document.querySelector("#ticket-text").value;
  const result = classify(text);
  let createdTicket;
  if (API_URL) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({message: text, email: document.querySelector("#email").value})
      });
      if (!response.ok) throw new Error(`Ticket API returned ${response.status}`);
      createdTicket = normalizeTicket(await response.json());
    } catch (error) {
      console.error("SupportIQ could not create ticket:", error);
      form.style.display = "";
      document.querySelector("#processing").classList.remove("active");
      showToast("Ticket was not submitted", "Check the API connection and try again.");
      return;
    }
  } else {
    createdTicket = normalizeTicket({id: `TK-${1049 + tickets.length}`, title: text.split(/\r?\n/)[0].slice(0, 60), category: result.category, priority: result.priority, sentiment: result.sentiment, status: "Open", updated: "Just now", message: text});
    tickets.unshift(createdTicket);
  }
  setTimeout(() => {
    document.querySelector("#processing").classList.remove("active"); document.querySelector("#success-result").classList.add("active");
    document.querySelector("#result-category").textContent = createdTicket.category; document.querySelector("#result-priority").textContent = createdTicket.priority; document.querySelector("#result-sentiment").textContent = createdTicket.sentiment;
    document.querySelector("#success-copy").textContent = `We’ve created ${createdTicket.id} and routed it to the ${createdTicket.category.toLowerCase()} queue.`;
    document.querySelector("#suggested-reply").value = `Hi there,\n\nThanks for reaching out. I’m sorry you’re experiencing this. Our team has received your request and is looking into it now. We’ll get back to you with an update as soon as possible.\n\nBest,\nThe SupportIQ team`;
    renderTickets();
  }, API_URL ? 150 : 1200);
});
document.querySelector("#done-btn").addEventListener("click", () => { closeModal(); showToast(); });
function showToast(title = "Ticket updated", detail = "Your changes have been saved.") { const toast = document.querySelector("#toast"); toast.querySelector("b").textContent = title; toast.querySelector("small").textContent = detail; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 3200); }
document.querySelector("#mobile-menu").addEventListener("click", () => document.querySelector("#sidebar").classList.toggle("open"));
document.querySelectorAll(".nav-item").forEach(item => item.addEventListener("click", () => { document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active")); item.classList.add("active"); if (item.dataset.view === "tickets") document.querySelector("#tickets-section").scrollIntoView({behavior:"smooth"}); }));
