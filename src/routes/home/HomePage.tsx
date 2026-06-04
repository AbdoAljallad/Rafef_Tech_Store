import { RadialMenu } from '../../modules/home/components/RadialMenu';

export function HomePage() {
  return (
    <div className="home-workspace">
      <div className="home-widget-zone top-left" aria-hidden="true" />
      <div className="home-widget-zone top-right" aria-hidden="true" />
      <RadialMenu />
      <div className="home-widget-zone bottom-left" aria-hidden="true" />
      <div className="home-widget-zone bottom-right" aria-hidden="true" />
    </div>
  );
}
