import React, { useEffect, useRef, memo } from 'react';

const TradingViewWidget = memo(() => {
  const container = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    
    const config = {
      "symbols": [
        ["Brent Crude Oil", "FX_IDC:USDBRO|3M"]
      ],
      "chartOnly": false,
      "width": "100%",
      "height": "550",
      "locale": "en",
      "colorTheme": "light",
      "autosize": false,
      "showVolume": true,
      "showMA": true,
      "hideDateRanges": false,
      "hideMarketStatus": false,
      "hideSymbolLogo": false,
      "scalePosition": "right",
      "scaleMode": "Normal",
      "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      "fontSize": "12",
      "noTimeScale": false,
      "valuesTracking": "1",
      "changeMode": "price-and-percent",
      "chartType": "area",
      "maLineColor": "#2962FF",
      "maLineWidth": 1,
      "maLength": 20,
      "lineWidth": 2,
      "lineType": 0
    };

    script.innerHTML = JSON.stringify(config);

    const currentContainer = container.current;
    if (currentContainer) {
      currentContainer.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
      currentContainer.appendChild(script);
    }

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, []);

  return (
    <div 
      className="tradingview-widget-container" 
      ref={container}
      style={{ 
        width: '100%',
        height: '550px'
      }}
    />
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';

export default TradingViewWidget; 