(function () {
  // 月相计算：以 2000-01-06 18:14 UTC 的新月为基准，使用平均朔望月。
  // 精度足够做视觉呈现，不追求天文历表级别的精确时间。
  var SYNODIC_MONTH = 29.530588853;
  var REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
  var DAY = 24 * 60 * 60 * 1000;
  var MOON_TEXTURE = '/images/moon-texture.webp';
  var HORIZON = 540;
  var REFLECTION_SHIFT = 940;

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function getPhase(date) {
    var days = (date.getTime() - REFERENCE_NEW_MOON) / DAY;
    var age = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
    return {
      age: age,
      fraction: age / SYNODIC_MONTH,
      illuminated: (1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2,
      waxing: age < SYNODIC_MONTH / 2
    };
  }

  function phaseName(phase) {
    var age = phase.age;
    if (age < 1.84566 || age >= 27.68228) return '新月';
    if (age < 5.53699) return '娥眉月';
    if (age < 9.22831) return '上弦月';
    if (age < 12.91963) return '盈凸月';
    if (age < 16.61096) return '满月';
    if (age < 20.30228) return '亏凸月';
    if (age < 23.99361) return '下弦月';
    return '残月';
  }

  function moonPath(phase) {
    var r = 78;
    var cx = 1216;
    var cy = 310;
    var k = phase.illuminated;
    var rx = Math.max(0.01, Math.abs(1 - 2 * k) * r);
    var top = cy - r;
    var bottom = cy + r;
    var outerSweep = phase.waxing ? 1 : 0;
    var innerSweep = phase.waxing ? (k < 0.5 ? 0 : 1) : (k < 0.5 ? 1 : 0);

    return [
      'M ' + cx + ' ' + top,
      'A ' + r + ' ' + r + ' 0 0 ' + outerSweep + ' ' + cx + ' ' + bottom,
      'A ' + rx + ' ' + r + ' 0 0 ' + innerSweep + ' ' + cx + ' ' + top,
      'Z'
    ].join(' ');
  }

  function litMoonMarkup(phase, textureDataUrl, opacity) {
    if (textureDataUrl) {
      return '<image x="1138" y="232" width="156" height="156" href="' + textureDataUrl +
        '" preserveAspectRatio="xMidYMid slice" clip-path="url(#lit-moon)" opacity="' + opacity + '"/>';
    }
    return '<path d="' + moonPath(phase) + '" fill="#F5E8BC" opacity="' + opacity + '"/>';
  }

  function buildSvg(phase, textureDataUrl) {
    var glowOpacity = (0.07 + phase.illuminated * 0.22).toFixed(3);
    var moonOpacity = (0.72 + phase.illuminated * 0.26).toFixed(3);
    var moon = litMoonMarkup(phase, textureDataUrl, moonOpacity);

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">',
      '<defs>',
      '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#040B16"/>',
      '<stop offset="0.52" stop-color="#0A1D33"/>',
      '<stop offset="1" stop-color="#123047"/>',
      '</linearGradient>',
      '<radialGradient id="glow" cx="76%" cy="38%" r="36%">',
      '<stop offset="0" stop-color="#FFF4CC" stop-opacity="' + glowOpacity + '"/>',
      '<stop offset="0.45" stop-color="#C9DCEC" stop-opacity="0.10"/>',
      '<stop offset="1" stop-color="#0A1D33" stop-opacity="0"/>',
      '</radialGradient>',
      '<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#12324A"/>',
      '<stop offset="1" stop-color="#061322"/>',
      '</linearGradient>',
      '<linearGradient id="reflection" gradientUnits="userSpaceOnUse" x1="0" y1="' + HORIZON + '" x2="0" y2="880">',
      '<stop offset="0" stop-color="#FFF4CC" stop-opacity="0.78"/>',
      '<stop offset="0.42" stop-color="#F3E6B8" stop-opacity="0.32"/>',
      '<stop offset="1" stop-color="#F3E6B8" stop-opacity="0"/>',
      '</linearGradient>',
      '<radialGradient id="reflection-glow" gradientUnits="userSpaceOnUse" cx="1216" cy="620" r="180">',
      '<stop offset="0" stop-color="#FFF4CC" stop-opacity="0.34"/>',
      '<stop offset="0.46" stop-color="#D8BD7A" stop-opacity="0.14"/>',
      '<stop offset="1" stop-color="#0A1D33" stop-opacity="0"/>',
      '</radialGradient>',
      '<clipPath id="lit-moon"><path d="' + moonPath(phase) + '"/></clipPath>',
      '</defs>',
      '<rect width="1600" height="900" fill="url(#sky)"/>',
      '<rect width="1600" height="900" fill="url(#glow)"/>',
      moon,
      '<rect x="0" y="' + HORIZON + '" width="1600" height="' + (900 - HORIZON) + '" fill="url(#sea)"/>',
      '<ellipse cx="1216" cy="620" rx="190" ry="220" fill="url(#reflection-glow)" opacity="0.78"/>',
      '<g fill="none" stroke="url(#reflection)" stroke-width="3" stroke-linecap="round">',
      '<path d="M1192 550 H1240" opacity="0.82"/>',
      '<path d="M1182 566 H1250" opacity="0.76"/>',
      '<path d="M1200 582 H1232" opacity="0.70"/>',
      '<path d="M1170 600 H1262" opacity="0.64"/>',
      '<path d="M1188 620 H1244" opacity="0.58"/>',
      '<path d="M1158 642 H1274" opacity="0.52"/>',
      '<path d="M1178 666 H1254" opacity="0.45"/>',
      '<path d="M1148 694 H1284" opacity="0.38"/>',
      '<path d="M1170 726 H1262" opacity="0.30"/>',
      '<path d="M1138 762 H1294" opacity="0.22"/>',
      '<path d="M1164 804 H1268" opacity="0.14"/>',
      '</g>',
      '<g fill="none" stroke="#A9C6DD" stroke-width="2" opacity="0.08">',
      '<path d="M0 620 C220 594 420 646 640 616 C860 586 1080 644 1300 610 C1450 586 1540 610 1620 600"/>',
      '<path d="M0 700 C240 672 460 724 700 692 C940 660 1160 718 1400 684 C1520 668 1580 686 1620 678"/>',
      '<path d="M0 790 C280 762 520 814 760 780 C990 748 1220 806 1450 772 C1540 758 1590 774 1620 768"/>',
      '</g>',
      '<path d="M0 ' + HORIZON + ' H1600" stroke="#D7C28D" stroke-width="1.5" opacity="0.20"/>',
      '</svg>'
    ].join('');
  }

  function apply(textureDataUrl) {
    var now = new Date();
    var phase = getPhase(now);
    var svg = buildSvg(phase, textureDataUrl || '');
    var url = 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';

    document.documentElement.style.setProperty('--moon-image', url);
    document.documentElement.setAttribute('data-moon-phase', phaseName(phase));
    document.documentElement.setAttribute('data-moon-illumination', Math.round(phase.illuminated * 100) + '%');
    document.documentElement.setAttribute('data-moon-date', now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()));
  }

  function blobToDataUrl(blob, callback) {
    var reader = new FileReader();
    reader.onload = function () { callback(reader.result); };
    reader.onerror = function () { callback(''); };
    reader.readAsDataURL(blob);
  }

  apply('');

  if (window.fetch) {
    fetch(MOON_TEXTURE)
      .then(function (response) {
        if (!response.ok) throw new Error('texture not found');
        return response.blob();
      })
      .then(function (blob) {
        blobToDataUrl(blob, function (dataUrl) {
          if (!dataUrl) return;
          var comma = dataUrl.indexOf(',');
          if (comma > -1) {
            dataUrl = 'data:image/webp;base64,' + dataUrl.slice(comma + 1);
          }
          apply(dataUrl);
        });
      })
      .catch(function () {
        // 纹理加载失败时保留纯色月相兜底。
      });
  }
})();
