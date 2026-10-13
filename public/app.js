const statsGrid = document.getElementById('stats-grid');
const feedList = document.getElementById('feed-list');
const instagramPanel = document.getElementById('instagram-panel');

const statDefinitions = [
  { label: 'Total reach', key: 'totalReach', format: 'compact' },
  { label: 'Engagement rate', key: 'engagementRate', format: 'percent' },
  { label: 'Mentions', key: 'mentions', format: 'number' },
  { label: 'Active campaigns', key: 'activeCampaigns', format: 'number' }
];

function formatCompact(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderStats(metrics) {
  statsGrid.innerHTML = statDefinitions.map((stat) => {
    const value = metrics[stat.key];
    let display = value;

    if (stat.format === 'compact') display = formatCompact(value);
    if (stat.format === 'percent') display = formatPercent(value);

    return `
      <article class="stat-card">
        <div class="stat-label">${stat.label}</div>
        <div class="stat-value">${display}</div>
        <div class="stat-meta">
          <span>+12.4%</span>
          <span>vs last week</span>
        </div>
      </article>
    `;
  }).join('');
}

function renderFeed(items, source, sources = {}) {
  if (!items.length) {
    const failedSources = Object.entries(sources)
      .filter(([, status]) => status.status === 'error')
      .map(([platform]) => platform);
    const detail = failedSources.length ? ` Check ${failedSources.join(', ')} API access.` : '';
    feedList.innerHTML = `<p class="empty-state">No live posts are available.${escapeHtml(detail)}</p>`;
    return;
  }

  feedList.innerHTML = items.map((item) => `
    <article class="post-card">
      <div class="post-top">
        <div class="user-meta">
          <div class="avatar" style="background:${item.accent};">${escapeHtml(item.user.slice(1, 2).toUpperCase())}</div>
          <div class="handle">
            <strong>${escapeHtml(item.handle)}</strong>
            <span>${escapeHtml(item.user)} · ${escapeHtml(item.time)}</span>
          </div>
        </div>
        <span class="platform-badge" style="background:${item.accent};">${escapeHtml(item.platform)}</span>
      </div>
      <p class="post-text">${escapeHtml(item.text)}</p>
      <div class="post-metrics">
        <span>❤️ ${item.likes.toLocaleString()}</span>
        <span>💬 ${item.comments.toLocaleString()}</span>
        <span>🔁 ${item.shares.toLocaleString()}</span>
      </div>
    </article>
  `).join('');
}

function renderInstagram(data) {
  if (!data || !Array.isArray(data.posts)) return;
  const { posts } = data;

  if (!posts.length) {
    instagramPanel.innerHTML = '<p class="empty-state">No live Instagram posts are available.</p>';
    return;
  }

  instagramPanel.innerHTML = `
    <div class="instagram-summary">
      <div class="instagram-row">
        <span>${escapeHtml(data.account)}</span>
        <span>Live</span>
      </div>
      <strong>${posts.length} recent posts</strong>
    </div>
    <div class="instagram-posts">
      ${posts.slice(0, 3).map((post) => `
        <div class="instagram-post">
          <strong>${escapeHtml(post.posted)}</strong>
          <p>${escapeHtml(post.caption)}</p>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadDashboard() {
  try {
    const response = await fetch('/api/feed');
    const data = await response.json();
    renderStats(data.metrics);

    const liveResponse = await fetch('/api/social/live');
    const liveData = await liveResponse.json();
    renderFeed(liveData.items, liveData.source, liveData.sources);

    const instagramResponse = await fetch('/api/instagram');
    const instagramData = await instagramResponse.json();
    renderInstagram(instagramData);
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
}

async function pollLiveUpdates() {
  try {
    const response = await fetch('/api/social/live');
    const data = await response.json();
    renderFeed(data.items, data.source, data.sources);
  } catch (error) {
    console.error('Failed to fetch live updates:', error);
  }
}

loadDashboard();
setInterval(pollLiveUpdates, 5000);
