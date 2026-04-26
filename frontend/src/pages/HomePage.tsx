import { Container, Shell } from "../components/ui";

export function HomePage() {
  return (
    <Shell publicMode>
      <Container narrow>
        <div className="home-hero">
          <h1 className="home-title">Page Mirror</h1>
          <p className="home-copy">网页快照抓取与分享工具</p>
          <div className="home-features">
            <div className="feature-item">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"/>
                </svg>
              </div>
              <strong>抓取网页片段</strong>
              <span>通过 URL 和 DOM 选择器精准抓取目标内容</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V3.375c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v3.375m-4.5 0h7.875L21 15.75m-3.75-6a2.25 2.25 0 0 1 2.25 2.25v3.75h-3v-3.75a1.5 1.5 0 0 0-1.5-1.5h-1.5"/>
                </svg>
              </div>
              <strong>安全存储</strong>
              <span>请求头加密存储，快照内容经过安全过滤</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"/>
                </svg>
              </div>
              <strong>一键分享</strong>
              <span>生成分享链接，他人无需登录即可查看</span>
            </div>
          </div>
        </div>
      </Container>
    </Shell>
  );
}
