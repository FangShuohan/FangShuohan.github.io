function initStartupAnimation() {
  const layer = document.getElementById('startup-layer');
  const container = document.getElementById('lottie-container');
  
  if (!layer || !container) return;

  const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html';
  const hasPlayed = sessionStorage.getItem('startupPlayed');

  // 只有在首页、且没播放过时，才显现实体层并播放动画
  if (isHomePage && !hasPlayed) {
    layer.style.display = 'flex'; // 唤醒遮罩层
    
    // 初始化 Lottie
    const animation = lottie.loadAnimation({
      container: container,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: '/js/startup.json'
    });

    animation.setSpeed(2.5); // 播放倍速

    // 核心淡出逻辑
    function fadeOutAndHide() {
      layer.classList.add('startup-fade-out'); // 加上这个类，触发 CSS 的 0.8 秒淡出
      
      // 等待淡出动画结束（800毫秒）后，彻底从底层抹除它
      setTimeout(() => {
        layer.style.display = 'none';
        sessionStorage.setItem('startupPlayed', 'true'); // 记录已播放
      }, 800); 
    }

    // 动画播完自动淡出
    animation.onComplete = fadeOutAndHide;
    // 点击屏幕随时强制淡出
    layer.addEventListener('click', fadeOutAndHide);

  } else {
    // 非首页，或已播过，确保它绝对隐藏
    layer.style.display = 'none';
  }
}

// 监听正常刷新
document.addEventListener("DOMContentLoaded", initStartupAnimation);
// 监听 Fluid 主题的 Pjax 无刷新跳转（解决白屏的特效药）
document.addEventListener("pjax:complete", initStartupAnimation);