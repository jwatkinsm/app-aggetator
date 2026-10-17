const analyticsStats = document.getElementById('analytics-stats');
const platformBreakdown = document.getElementById('platform-breakdown');
const engagementBreakdown = document.getElementById('engagement-breakdown');
const sentimentBreakdown = document.getElementById('sentiment-breakdown');
const topPosts = document.getElementById('top-posts');

function formatCompact(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
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

function updateAudiencePulse(items) {
  const pulseValue = document.getElementById('audience-pulse-value');
  const pulseLabel = document.getElementById('audience-pulse-label');
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
  pulseValue.textContent = `${Math.round((positiveItems / scoredItems.length) * 100)}%`;
  pulseLabel.textContent = 'Positive sentiment';
}

function getEngagementCounts(item) {
  // Social APIs can omit metrics or return malformed values; keep chart totals numeric and nonnegative.
  const count = (value) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  return {
    likes: count(item.likes),
    comments: count(item.comments),
    shares: count(item.shares),
    reposts: count(item.reposts ?? item.repostCount)
  };
}

function renderAnalytics(items) {
  // These summaries describe only the current live-feed sample, not a historical reporting period.
  const engagementTotals = { likes: 0, comments: 0, shares: 0, reposts: 0 };
  const platforms = new Map();
  const sentiments = { positive: 0, neutral: 0, negative: 0 };
  const sentimentLabels = ['positive', 'neutral', 'negative'];

  items.forEach((item) => {
    const counts = getEngagementCounts(item);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const platform = item.platform || 'Other';
    const platformStats = platforms.get(platform) || { interactions: 0, posts: 0 };

    Object.keys(engagementTotals).forEach((key) => {
      engagementTotals[key] += counts[key];
    });
    platformStats.interactions += total;
    platformStats.posts += 1;
    platforms.set(platform, platformStats);

    const sentiment = String(item.sentiment || '').toLowerCase();
    if (sentimentLabels.includes(sentiment)) sentiments[sentiment] += 1;
  });

  const interactionTotal = Object.values(engagementTotals).reduce((sum, count) => sum + count, 0);
  // Unknown sentiment labels are excluded from the denominator rather than counted as neutral.
  const sentimentTotal = Object.values(sentiments).reduce((sum, count) => sum + count, 0);
  const positiveRate = sentimentTotal ? Math.round((sentiments.positive / sentimentTotal) * 100) : null;
  const averageInteractions = items.length ? Math.round(interactionTotal / items.length) : 0;

  analyticsStats.innerHTML = [
    { label: 'Posts analysed', value: items.length.toLocaleString() },
    { label: 'Total interactions', value: formatCompact(interactionTotal) },
    { label: 'Avg. interactions / post', value: formatCompact(averageInteractions) },
    { label: 'Positive sentiment', value: positiveRate === null ? '—' : `${positiveRate}%` }
  ].map((stat) => `
    <article class="analytics-stat">
      <span>${stat.label}</span>
      <strong>${stat.value}</strong>
    </article>
  `).join('');

  const platformEntries = [...platforms.entries()].sort((a, b) => b[1].interactions - a[1].interactions);
  // Scale each platform against the busiest one; the floor avoids division by zero for empty data.
  const maxPlatformInteractions = Math.max(1, ...platformEntries.map(([, stats]) => stats.interactions));
  platformBreakdown.innerHTML = platformEntries.length
    ? platformEntries.map(([platform, stats]) => `
      <div class="bar-row">
        <div class="bar-label"><span>${escapeHtml(platform)}</span><strong>${formatCompact(stats.interactions)}</strong></div>
        <div class="bar-track" role="img" aria-label="${escapeHtml(`${platform}: ${stats.interactions} interactions`)}">
          <span class="bar-fill platform-fill" style="width:${(stats.interactions / maxPlatformInteractions) * 100}%"></span>
        </div>
        <span class="bar-detail">${stats.posts} ${stats.posts === 1 ? 'post' : 'posts'}</span>
      </div>
    `).join('')
    : '<p class="empty-state">No posts to analyse yet.</p>';

  const engagementLabels = {
    likes: 'Likes',
    comments: 'Comments',
    shares: 'Shares',
    reposts: 'Reposts'
  };
  const maxEngagement = Math.max(1, ...Object.values(engagementTotals));
  engagementBreakdown.innerHTML = interactionTotal
    ? Object.entries(engagementTotals).map(([key, count]) => `
      <div class="bar-row">
        <div class="bar-label"><span>${engagementLabels[key]}</span><strong>${formatCompact(count)}</strong></div>
        <div class="bar-track" role="img" aria-label="${engagementLabels[key]}: ${count}">
          <span class="bar-fill engagement-fill engagement-${key}" style="width:${(count / maxEngagement) * 100}%"></span>
        </div>
        <span class="bar-detail">${Math.round((count / interactionTotal) * 100)}% of interactions</span>
      </div>
    `).join('')
    : '<p class="empty-state">No interactions to break down yet.</p>';

  sentimentBreakdown.innerHTML = sentimentTotal
    ? sentimentLabels.map((sentiment) => `
      <div class="sentiment-row">
        <div class="bar-label"><span class="sentiment-name sentiment-${sentiment}">${sentiment}</span><strong>${sentiments[sentiment]}</strong></div>
        <div class="bar-track" role="img" aria-label="${sentiment}: ${sentiments[sentiment]} posts">
          <span class="bar-fill sentiment-fill sentiment-${sentiment}" style="width:${(sentiments[sentiment] / sentimentTotal) * 100}%"></span>
        </div>
        <span class="bar-detail">${Math.round((sentiments[sentiment] / sentimentTotal) * 100)}% of labelled posts</span>
      </div>
    `).join('')
    : '<p class="empty-state">Sentiment data is not available for these posts.</p>';

  const rankedPosts = items.map((item) => ({
    item,
    interactions: Object.values(getEngagementCounts(item)).reduce((sum, count) => sum + count, 0)
  })).sort((a, b) => b.interactions - a.interactions).slice(0, 3);
  topPosts.innerHTML = rankedPosts.length
    ? rankedPosts.map(({ item, interactions }, index) => `
      <article class="top-post">
        <span class="top-post-rank">${index + 1}</span>
        <div class="top-post-copy">
          <strong>${escapeHtml(item.platform || 'Social')} · ${escapeHtml(item.handle || item.user || 'Post')}</strong>
          <p>${escapeHtml(item.text || 'No post text available.')}</p>
        </div>
        <span class="top-post-total">${formatCompact(interactions)}</span>
      </article>
    `).join('')
    : '<p class="empty-state">No posts to rank yet.</p>';
}

async function refreshAnalytics() {
  try {
    const response = await fetch('/api/social/live');
    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    renderAnalytics(items);
    updateAudiencePulse(items);
  } catch (error) {
    console.error('Failed to fetch analytics data:', error);
  }
}

refreshAnalytics();
setInterval(refreshAnalytics, 5000);
