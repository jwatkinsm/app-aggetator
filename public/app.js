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

function formatComparison(change) {
  const prefix = change > 0 ? '+' : change < 0 ? '-' : '';
  return `${prefix}${Math.abs(change).toFixed(1)}%`;
}

function renderStats(metrics) {
  statsGrid.innerHTML = statDefinitions.map((stat) => {
    const value = metrics[stat.key];
    const comparison = metrics.comparison?.[stat.key] ?? { change: 0 };
    const percentChange = Number(comparison.change ?? 0);
    let display = value;

    if (stat.format === 'compact') display = formatCompact(value);
    if (stat.format === 'percent') display = formatPercent(value);

    return `
      <article class="stat-card">
        <div class="stat-label">${stat.label}</div>
        <div class="stat-value">${display}</div>
        <div class="stat-meta">
          <span>${formatComparison(percentChange)}</span>
          <span>vs last week</span>
        </div>
      </article>
    `;
  }).join('');
}

function updateAudiencePulse(items) {
  const pulseValue = document.getElementById('audience-pulse-value');
  const pulseLabel = document.getElementById('audience-pulse-label');
  // Exclude missing or unknown labels so the pulse reflects only classified posts.
  const scoredItems = items.filter((item) =>
    ['positive', 'neutral', 'negative'].includes(String(item.sentiment || '').toLowerCase())
  );

  if (!scoredItems.length) {
    pulseValue.textContent = '—';
    pulseLabel.textContent = 'No sentiment data';
    return;
  }

  const positiveItems = scoredItems.filter((item) =>
    String(item.sentiment).toLowerCase() === 'positive'
  ).length;
  const score = Math.round((positiveItems / scoredItems.length) * 100);

  pulseValue.textContent = `${score}%`;
  pulseLabel.textContent = 'Positive sentiment';
}

function collectNestedMediaUrls(node) {
  if (!node || typeof node !== 'object') return [];

  const urls = typeof node.media_url === 'string' ? [node.media_url] : [];
  const children = Array.isArray(node.children?.data) ? node.children.data : [];
  return urls.concat(...children.map(collectNestedMediaUrls));
}

function getMediaUrls(post) {
  const candidateSets = [
    post?.mediaUrls,
    post?.images,
    post?.imageUrls,
    post?.mediaUrl ? [post.mediaUrl] : [],
    post?.image ? [post.image] : [],
    collectNestedMediaUrls(post)
  ];

  const urls = candidateSets.flat().filter((value) => typeof value === 'string' && value.trim());
  return [...new Set(urls)];
}

function renderMediaGrid(mediaUrls, altText, className = 'post-image') {
  if (!mediaUrls.length) return '';

  return `
    <div class="media-grid">
      ${mediaUrls.slice(0, 4).map((url, index) => `
        <img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(`${altText || 'Post image'} ${index + 1}`)}" />
      `).join('')}
    </div>
  `;
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

  feedList.innerHTML = items.map((item) => {
    const mediaUrls = getMediaUrls(item);
    const mediaMarkup = renderMediaGrid(mediaUrls, item.text || item.handle, 'post-image');
    const likes = Number(item.likes ?? 0);
    const comments = Number(item.comments ?? 0);
    const shares = Number(item.shares ?? 0);
    const reposts = Number(item.reposts ?? item.repostCount ?? 0);

    return `
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
        ${mediaMarkup}
        <div class="post-metrics">
          <span>❤️ ${likes.toLocaleString()}</span>
          <span>💬 ${comments.toLocaleString()}</span>
          <span>🔁 ${shares.toLocaleString()}</span>
          <span>↻ ${reposts.toLocaleString()}</span>
        </div>
      </article>
    `;
  }).join('');
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
      ${posts.slice(0, 3).map((post) => {
        const mediaUrls = getMediaUrls(post);

        return `
          <div class="instagram-post">
            <strong>${escapeHtml(post.posted)}</strong>
            ${renderMediaGrid(mediaUrls, post.caption || 'Instagram post', 'instagram-image')}
            <p>${escapeHtml(post.caption)}</p>
          </div>
        `;
      }).join('')}
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
    const items = Array.isArray(liveData.items) ? liveData.items : [];
    renderFeed(items, liveData.source, liveData.sources);
    updateAudiencePulse(items);

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
    const items = Array.isArray(data.items) ? data.items : [];
    renderFeed(items, data.source, data.sources);
    updateAudiencePulse(items);
  } catch (error) {
    console.error('Failed to fetch live updates:', error);
  }
}

loadDashboard();
setInterval(pollLiveUpdates, 5000);
