(function () {
  // 月相计算：以 2000-01-06 18:14 UTC 的新月为基准，使用平均朔望月。
  // 精度足够做视觉呈现，不追求天文历表级别的精确时间。
  var SYNODIC_MONTH = 29.530588853;
  var REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
  var DAY = 24 * 60 * 60 * 1000;

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
    var left = cx - r;
    var right = cx + r;
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

  function buildSvg(phase) {
    var litPath = moonPath(phase);
    var glowOpacity = (0.08 + phase.illuminated * 0.26).toFixed(3);
    var moonOpacity = (0.62 + phase.illuminated * 0.36).toFixed(3);

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">',
      '<defs>',
      '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#040B16"/>',
      '<stop offset="0.48" stop-color="#0A1D33"/>',
      '<stop offset="1" stop-color="#173A55"/>',
      '</linearGradient>',
      '<radialGradient id="glow" cx="76%" cy="38%" r="36%">',
      '<stop offset="0" stop-color="#FFF4CC" stop-opacity="' + glowOpacity + '"/>',
      '<stop offset="0.42" stop-color="#C9DCEC" stop-opacity="0.12"/>',
      '<stop offset="1" stop-color="#0A1D33" stop-opacity="0"/>',
      '</radialGradient>',
      '<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#12324A"/>',
      '<stop offset="1" stop-color="#061322"/>',
      '</linearGradient>',
      '<linearGradient id="reflection" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#F3E6B8" stop-opacity="0.42"/>',
      '<stop offset="1" stop-color="#F3E6B8" stop-opacity="0"/>',
      '</linearGradient>',
      '</defs>',
      '<rect width="1600" height="900" fill="url(#sky)"/>',
      '<rect width="1600" height="900" fill="url(#glow)"/>',
      '<circle cx="1216" cy="310" r="78" fill="#0A1828" opacity="0.72"/>',
      '<path d="' + litPath + '" fill="#F5E8BC" opacity="' + moonOpacity + '"/>',
      '<circle cx="1216" cy="310" r="91" fill="none" stroke="#F5E8BC" stroke-width="1" opacity="0.28"/>',
      '<path d="M0 452 L0 414 L118 392 L214 410 L318 360 L421 414 L540 386 L650 430 L760 402 L900 438 L1040 410 L1180 442 L1310 418 L1450 446 L1600 420 L1600 452 Z" fill="#06182A" opacity="0.72"/>',
      '<path d="M0 456 C220 426 420 470 640 448 C860 426 1080 468 1300 446 C1450 432 1530 448 1600 440 L1600 900 L0 900 Z" fill="url(#sea)"/>',
      '<g fill="none" stroke="#A9C6DD" stroke-width="2" opacity="0.16">',
      '<path d="M-20 510 C190 478 400 542 620 506 C840 470 1060 538 1280 500 C1450 470 1540 500 1620 486"/>',
      '<path d="M-20 568 C210 536 420 600 650 562 C870 526 1090 596 1310 556 C1460 528 1550 556 1620 544"/>',
      '<path d="M-20 634 C240 598 450 668 680 628 C910 588 1130 662 1350 620 C1500 592 1570 618 1620 608"/>',
      '<path d="M-20 708 C260 670 480 744 720 700 C950 658 1170 736 1400 692 C1520 670 1580 690 1620 682"/>',
      '<path d="M-20 790 C280 752 520 826 760 780 C990 738 1220 816 1450 772 C1540 756 1590 772 1620 766"/>',
      '</g>',
      '<g fill="none" stroke="url(#reflection)" stroke-width="3" stroke-linecap="round" opacity="0.58">',
      '<path d="M1198 462 L1232 462"/>',
      '<path d="M1184 500 L1248 500"/>',
      '<path d="M1204 540 L1228 540"/>',
      '<path d="M1176 582 L1256 582"/>',
      '<path d="M1200 628 L1232 628"/>',
      '<path d="M1168 678 L1264 678"/>',
      '<path d="M1196 734 L1236 734"/>',
      '</g>',
      '<g fill="none" stroke="#D7C28D" stroke-width="1.5" opacity="0.26">',
      '<path d="M130 750 Q220 720 310 750 Q400 780 490 750"/>',
      '<path d="M980 812 Q1070 782 1160 812 Q1250 842 1340 812"/>',
      '</g>',
      '</svg>'
    ].join('');
  }

  function apply() {
    var now = new Date();
    var phase = getPhase(now);
    var svg = buildSvg(phase);
    var url = 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';

    document.documentElement.style.setProperty('--moon-image', url);
    document.documentElement.setAttribute('data-moon-phase', phaseName(phase));
    document.documentElement.setAttribute('data-moon-illumination', Math.round(phase.illuminated * 100) + '%');
    document.documentElement.setAttribute('data-moon-date', now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()));
  }

  apply();
})();
