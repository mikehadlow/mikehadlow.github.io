(function() {
    'use strict';

    const BSKY_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread';

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const container = document.getElementById('bluesky-comments');
        if (!container) return;
        const postUri = container.dataset.postUri;
        if (!postUri) return;
        loadComments(container, postUri);
    }

    async function loadComments(container, postUri) {
        renderLoading(container);

        try {
            const response = await fetch(`${BSKY_API}?uri=${encodeURIComponent(postUri)}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            const replies = data.thread?.replies || [];

            if (replies.length === 0) {
                renderNoComments(container, postUri);
            } else {
                renderComments(container, postUri, replies);
            }
        } catch (error) {
            console.error('Failed to load BlueSky comments:', error);
            renderError(container, postUri);
        }
    }

    function renderLoading(container) {
        container.innerHTML = `
            <div class="box">
                <p class="has-text-grey">Loading comments from BlueSky...</p>
            </div>
        `;
    }

    function renderError(container, postUri) {
        const postUrl = atUriToWebUrl(postUri);
        container.innerHTML = `
            <div class="box">
                <p class="has-text-grey">Unable to load comments. <a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener noreferrer">View on BlueSky</a></p>
            </div>
        `;
    }

    function renderNoComments(container, postUri) {
        const postUrl = atUriToWebUrl(postUri);
        container.innerHTML = `
            <div class="box">
                <p class="has-text-grey">No comments yet. <a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener noreferrer">Be the first to comment on BlueSky</a></p>
            </div>
        `;
    }

    function renderComments(container, postUri, replies) {
        const postUrl = atUriToWebUrl(postUri);
        const commentsHtml = flattenReplies(replies, 0)
            .map(item => renderComment(item.reply, item.depth))
            .join('');

        container.innerHTML = `
            <div class="box">
                <p class="mb-4">
                    <a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener noreferrer">Join the conversation on BlueSky</a>
                </p>
                ${commentsHtml}
            </div>
        `;
    }

    function flattenReplies(replies, depth) {
        const result = [];
        for (const reply of replies) {
            if (reply.$type !== 'app.bsky.feed.defs#threadViewPost' || !reply.post) {
                continue;
            }
            result.push({ reply: reply.post, depth: Math.min(depth, 2) });
            if (reply.replies && reply.replies.length > 0) {
                result.push(...flattenReplies(reply.replies, depth + 1));
            }
        }
        return result;
    }

    function renderComment(post, depth) {
        const author = post.author || {};
        const record = post.record || {};
        const displayName = escapeHtml(author.displayName || author.handle || 'Unknown');
        const handle = escapeHtml(author.handle || '');
        const text = escapeHtml(record.text || '');
        const date = formatDate(record.createdAt);
        const postUrl = atUriToWebUrl(post.uri);

        const indentClass = depth > 0 ? ` ml-${depth === 1 ? '5' : '6'}` : '';

        return `
            <article class="mb-4${indentClass}">
                <p>
                    <strong>${displayName}</strong>
                    <small class="has-text-grey">
                        <a href="https://bsky.app/profile/${escapeHtml(handle)}" target="_blank" rel="noopener noreferrer">@${handle}</a>
                        · <a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener noreferrer">${date}</a>
                    </small>
                    <br>${text}
                </p>
            </article>
        `;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function atUriToWebUrl(atUri) {
        // at://did:plc:xxx/app.bsky.feed.post/yyy -> https://bsky.app/profile/did:plc:xxx/post/yyy
        if (!atUri || !atUri.startsWith('at://')) return '';
        const parts = atUri.slice(5).split('/');
        if (parts.length < 3) return '';
        const did = parts[0];
        const postId = parts[2];
        return `https://bsky.app/profile/${did}/post/${postId}`;
    }

    function formatDate(isoDate) {
        if (!isoDate) return '';
        try {
            const date = new Date(isoDate);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return '';
        }
    }

})();
