// Cloudflare Pages の Functions。*.pages.dev(テスト環境)で、配信カレンダーの歌唱履歴の API を中継する。
// 本番(mnkm.page)では、このパスは前段の Worker が配信カレンダーへ送るので、ここには届かない。
// 画面は同じオリジンの /prnb-stream-calendar/api/song-history を読む(CSP の connect-src 'self')ので、
// テスト環境でもそのまま動くよう、同じパスで本番の API の応答を返す。
const UPSTREAM = 'https://mnkm.page/prnb-stream-calendar/api/song-history';

export async function onRequestGet({ request }) {
    const talent = new URL(request.url).searchParams.get('talent') || '';
    // 楽曲リストのタレントの値(英小文字)だけを通す
    if (!/^[a-z]{1,16}$/.test(talent)) {
        return new Response(JSON.stringify({ error: 'bad_request' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
    const upstream = await fetch(`${UPSTREAM}?talent=${talent}`, {
        headers: { Accept: 'application/json' },
        cf: { cacheTtl: 300, cacheEverything: true }
    });
    return new Response(upstream.body, {
        status: upstream.status,
        headers: {
            'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=300'
        }
    });
}
