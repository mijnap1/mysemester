
    const cachedAuth = (() => {
      try {
        return JSON.parse(localStorage.getItem('uoft_auth_v1') || 'null');
      } catch (err) {
        return null;
      }
    })();

    const nextPage = (cachedAuth && cachedAuth.loggedIn && cachedAuth.username)
      ? '/main/'
      : '/login/';

    
    setTimeout(() => {
      window.location.href = nextPage;
    }, 2000);
  
