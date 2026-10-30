import { useAsk } from "../ask";

// Only http(s) and same-origin paths may become links or images; anything else (javascript:, data:) is dropped.
export const safeUrl = (u: string | undefined) => (u && /^(https?:\/\/|\/(?!\/))/.test(u) ? u : undefined);

export interface CarouselCard {
  id: string; title: string; subtitle: string; price?: string;
  imageUrl: string; iconUrl: string; linkUrl: string;
  clickPrompt: string; // sent as the user's next message when the card is tapped
}

export function CardCarouselView({ items, title }: { items: CarouselCard[]; title?: string }) {
  const ask = useAsk();
  return (
    <div className="carousel-wrap">
      {title && <h4 className="card-title">{title}</h4>}
      <div className="carousel">
        {items.map((c) => (
          <div key={c.id} className="cc" role="button" tabIndex={0} onClick={() => ask(c.clickPrompt)}>
            <div className="cc-img" style={safeUrl(c.imageUrl) ? { backgroundImage: `url(${safeUrl(c.imageUrl)})` } : undefined}>
              {safeUrl(c.iconUrl) && <img className="cc-icon" src={safeUrl(c.iconUrl)} alt="" />}
            </div>
            <div className="cc-body">
              <b>{c.title}</b>
              <small>{c.subtitle}</small>
              <div className="cc-foot">
                {c.price && <span className="hl">{c.price}</span>}
                {safeUrl(c.linkUrl) && (
                  <a href={safeUrl(c.linkUrl)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Details ↗</a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
