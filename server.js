const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8085;

const fallbackFeed = [
  {
    id: 1,
    platform: 'Instagram',
    user: '@wanderly',
    handle: 'Wanderly Studio',
    time: '9m ago',
    text: 'Sunset reels from Lisbon are up — the community is loving the new travel mini-series.',
    likes: 2460,
    comments: 167,
    shares: 314,
    reposts: 188,
    sentiment: 'positive',
    accent: '#E1306C'
  },
  {
    id: 2,
    platform: 'LinkedIn',
    user: '@hannahm',
    handle: 'Hannah M.',
    time: '17m ago',
    text: 'Remote leadership is shifting toward async clarity and better documentation rituals.',
    likes: 940,
    comments: 74,
    shares: 191,
    reposts: 63,
    sentiment: 'neutral',
    accent: '#0A66C2'
  },
  {
    id: 3,
    platform: 'Facebook',
    user: '@neonmarket',
    handle: 'Neon Market',
    time: '33m ago',
    text: 'Customer shoutout: “The new release feels fast, simple, and genuinely helpful.”',
    likes: 885,
    comments: 54,
    shares: 125,
    reposts: 41,
    sentiment: 'positive',
    accent: '#1877F2'
  }
];

function calculatePercentChange(currentValue, previousValue) {
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) {
    return 0;
  }

  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
}

function calculateMetrics(items = []) {
  const totalEngagement = items.reduce((sum, item) => {
    const likes = Number(item.likes ?? 0);
    const comments = Number(item.comments ?? 0);
    const shares = Number(item.shares ?? 0);
    const reposts = Number(item.reposts ?? item.repostCount ?? 0);
    return sum + likes + comments + shares + reposts;
  }, 0);

  const totalReach = Math.max(1, Math.round((totalEngagement * 4) + (items.length * 180)));
  const engagementRate = totalReach ? (totalEngagement / totalReach) * 100 : 0;
  const metrics = {
    totalReach,
    engagementRate: Number(engagementRate.toFixed(1)),
    mentions: items.length,
    activeCampaigns: new Set(items.map((item) => item.platform)).size
  };

  const baselineMultipliers = {
    totalReach: 1.124,
    engagementRate: 1.118,
    mentions: 1.145,
    activeCampaigns: 1.083
  };

  const comparison = Object.fromEntries(Object.entries(metrics).map(([key, value]) => {
    const previousValue = key === 'engagementRate'
      ? Number((value / baselineMultipliers[key]).toFixed(1))
      : Math.max(1, Math.round(value / baselineMultipliers[key]));

    return [key, {
      change: calculatePercentChange(value, previousValue),
      previousValue
    }];
  }));

  return { ...metrics, comparison };
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'social-media-dashboard' });
});

app.get('/api/feed', (_, res) => {
  res.json({ metrics: calculateMetrics(fallbackFeed), items: fallbackFeed });
});

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return response.json();
}

async function fetchInstagramLive() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!token || !accountId) {
    return [];
  }

  const url = `https://graph.facebook.com/v20.0/${accountId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,share_count,children{media_type,media_url}&access_token=${token}&limit=5`;
  const data = await fetchJson(url);

  return (data.data || []).map((post) => {
    const childMediaUrls = (post.children?.data || []).map((child) => child.media_url).filter(Boolean);
    const mediaUrls = [...new Set([post.media_url, ...childMediaUrls].filter(Boolean))];

    return {
      id: `instagram-${post.id}`,
      platform: 'Instagram',
      user: '@liveig',
      handle: 'Instagram Live',
      time: post.timestamp ? new Date(post.timestamp).toLocaleString() : 'just now',
      text: post.caption || 'Instagram live post',
      permalink: post.permalink,
      mediaType: post.media_type,
      mediaUrl: post.media_url,
      mediaUrls,
      likes: Number(post.like_count ?? 0),
      comments: Number(post.comments_count ?? 0),
      shares: Number(post.share_count ?? 0),
      reposts: Number(post.repost_count ?? 0),
      sentiment: 'positive',
      accent: '#E1306C'
    };
  });
}

async function fetchFacebookLive() {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!token || !pageId) {
    return [];
  }

  const url = `https://graph.facebook.com/v20.0/${pageId}/posts?fields=id,message,created_time,permalink_url,reactions.summary(true),comments.summary(true),shares&access_token=${token}&limit=5`;
  const data = await fetchJson(url);

  return (data.data || []).map((post) => ({
    id: `facebook-${post.id}`,
    platform: 'Facebook',
    user: '@livefacebook',
    handle: 'Facebook Page',
    time: post.created_time ? new Date(post.created_time).toLocaleString() : 'just now',
    text: post.message || 'Facebook page post',
    likes: Number(post.reactions?.summary?.total_count ?? 0),
    comments: Number(post.comments?.summary?.total_count ?? 0),
    shares: Number(post.shares?.count ?? 0),
    reposts: Number(post.repost_count ?? 0),
    sentiment: 'positive',
    accent: '#1877F2'
  }));
}

async function fetchLinkedInLive() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = process.env.LINKEDIN_ORGANIZATION_ID;

  if (!token || !orgId) {
    return [];
  }

  const url = `https://api.linkedin.com/v2/ugcPosts?authors=List(urn%3Ali%3Aorganization%3A${orgId})&count=5&sortBy=LAST_MODIFIED`;
  const data = await fetchJson(url, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-RestLi-Protocol-Version': '2.0.0'
  });

  return (data.elements || []).map((post, index) => {
    const content = post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || 'LinkedIn post';
    const social = post.totalSocialActivityCounts || post.socialActivityCounts || {};

    return {
      id: `linkedin-${post.id || index}`,
      platform: 'LinkedIn',
      user: '@livelinkedin',
      handle: 'LinkedIn Company',
      time: post.created?.time ? new Date(post.created.time).toLocaleString() : 'just now',
      text: content,
      likes: Number(social.likeCount ?? 0),
      comments: Number(social.commentCount ?? 0),
      shares: Number(social.shareCount ?? 0),
      reposts: Number(social.repostCount ?? 0),
      sentiment: 'neutral',
      accent: '#0A66C2'
    };
  });
}

async function fetchLiveSocialFeed() {
  const platforms = ['Instagram', 'Facebook', 'LinkedIn'];
  const results = await Promise.allSettled([
    fetchInstagramLive(),
    fetchFacebookLive(),
    fetchLinkedInLive()
  ]);

  const items = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);

  const sources = Object.fromEntries(results.map((result, index) => [
    platforms[index],
    result.status === 'fulfilled'
      ? { status: result.value.length ? 'live' : 'empty', count: result.value.length }
      : { status: 'error' }
  ]));

  return {
    items: items.slice(0, 9),
    source: items.length ? 'live' : 'unavailable',
    sources,
    metrics: calculateMetrics(items.slice(0, 9))
  };
}

app.get('/api/social/live', async (_, res) => {
  try {
    res.json(await fetchLiveSocialFeed());
  } catch (error) {
    res.status(502).json({ items: [], source: 'unavailable', error: 'Unable to fetch live social posts.' });
  }
});

app.get('/api/feed/live', async (_, res) => {
  try {
    res.json(await fetchLiveSocialFeed());
  } catch (error) {
    res.status(502).json({ items: [], source: 'unavailable', error: 'Unable to fetch live social posts.' });
  }
});

app.get('/api/instagram', async (_, res) => {
  try {
    const posts = await fetchInstagramLive();
    res.json({
      account: 'Instagram',
      source: posts.length ? 'live' : 'unavailable',
      posts: posts.map((post) => ({
        id: post.id,
        caption: post.text,
        posted: post.time,
        permalink: post.permalink,
        mediaType: post.mediaType,
        mediaUrl: post.mediaUrl,
        mediaUrls: post.mediaUrls || (post.mediaUrl ? [post.mediaUrl] : [])
      }))
    });
  } catch (error) {
    res.status(502).json({ account: 'Instagram', source: 'unavailable', posts: [], error: 'Unable to fetch Instagram posts.' });
  }
});

app.use((_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Social Media Dashboard running on http://localhost:${PORT}`);
  });
}

module.exports = {
  calculateMetrics,
  app
};
