
    (() => {
      const cachedAuth = (() => {
        try {
          return JSON.parse(localStorage.getItem('uoft_auth_v1') || 'null');
        } catch (err) {
          return null;
        }
      })();

      if (cachedAuth && cachedAuth.loggedIn && cachedAuth.username) {
        window.location.replace('/main/');
        return;
      }
    
    const body = document.body;
    const toggleBtn = document.querySelector('.theme-toggle');
    const icon = toggleBtn ? toggleBtn.querySelector('ion-icon') : null;
    let canUseStorage = true;

    try {
      localStorage.setItem('__mysemester_theme_test__', '1');
      localStorage.removeItem('__mysemester_theme_test__');
    } catch (err) {
      canUseStorage = false;
    }

    function setTheme(theme) {
      if (theme === 'dark') {
        body.classList.add('dark');
        if (icon) icon.setAttribute('name', 'sunny-outline');
      } else {
        body.classList.remove('dark');
        if (icon) icon.setAttribute('name', 'moon-outline');
      }
      if (canUseStorage) {
        localStorage.setItem('theme', theme);
      }
    }

    let savedTheme = null;
    if (canUseStorage) {
      try {
        savedTheme = localStorage.getItem('theme');
      } catch (err) {
        savedTheme = null;
      }
    }
    if (savedTheme === 'dark') {
      setTheme('dark');
    } else {
      setTheme('light');
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (body.classList.contains('dark')) {
          setTheme('light');
        } else {
          setTheme('dark');
        }
      });
    }

    
    const SUPABASE_URL = "https://dqstskgvdiwdkonbapke.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc3Rza2d2ZGl3ZGtvbmJhcGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMDI0NzYsImV4cCI6MjA3NTg3ODQ3Nn0.2iFEYtVQZjQOY8_sF4x0SvWIKk8L-jg4yzpXzLLFe60";

    function getSupabaseClient() {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
      return null;
    }

    let supabaseClient = getSupabaseClient();

    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');

    const usernameInputEl = document.getElementById('username');
    const passwordInputEl = document.getElementById('password');

    loginBtn.addEventListener('click', async () => {
      console.log('Login button clicked');
      const usernameOrEmail = usernameInputEl.value.trim();
      const password = passwordInputEl.value.trim();

      loginError.style.display = 'none';

      if (!supabaseClient) {
        supabaseClient = getSupabaseClient();
      }

      if (!supabaseClient) {
        loginError.textContent = 'Login is unavailable. Please check your connection and refresh.';
        loginError.style.display = 'block';
        return;
      }

      if (!usernameOrEmail || !password) {
        loginError.textContent = 'Please enter both username and password.';
        loginError.style.display = 'block';
        return;
      }

      const originalText = loginBtn.textContent;
      loginBtn.textContent = 'Signing in…';
      loginBtn.disabled = true;

      try {
        let emailToUse = null;

        
        const { data: emailFromRpc, error: rpcError } = await supabaseClient
          .rpc('get_email_by_username', { u: usernameOrEmail });

        if (emailFromRpc) {
          emailToUse = emailFromRpc;
        }

        if (!emailToUse && rpcError) {
          console.warn('Username lookup failed:', rpcError.message);
        }

        if (!emailToUse) {
          try {
            const cachedAuth = JSON.parse(localStorage.getItem('uoft_auth_v1') || 'null');
            if (cachedAuth && cachedAuth.username === usernameOrEmail && cachedAuth.email) {
              emailToUse = cachedAuth.email;
            }
          } catch (err) {
            
          }
        }

        
        if (!emailToUse) {
          emailToUse = usernameOrEmail;
        }

        
        let { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email: emailToUse,
          password,
        });

        
        if (signInError || !signInData?.user) {
          if (emailToUse !== usernameOrEmail) {
            const retry = await supabaseClient.auth.signInWithPassword({
              email: usernameOrEmail,
              password,
            });
            signInData = retry.data;
            signInError = retry.error;
          }
        }

        
        if (signInError || !signInData?.user) {
          loginError.textContent = 'Invalid username, email, or password.';
          loginError.style.display = 'block';
          return;
        }

        const email = signInData.user.email;

        
        const { data: userProfile } = await supabaseClient
          .from('profiles')
          .select('username, id')
          .eq('email', email)
          .maybeSingle();

        const resolvedUsername = userProfile?.username || email.split('@')[0];
        const profileId = userProfile?.id || null;

        
        localStorage.setItem('uoft_auth_v1', JSON.stringify({
          loggedIn: true,
          username: resolvedUsername,
          email: email,
          id: profileId,
        }));

        
        window.location.href = '/main/';
      } catch (err) {
        console.error('Login error:', err);
        loginError.textContent = 'Unexpected error. Please try again.';
        loginError.style.display = 'block';
      } finally {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
      }
    });
    })();
  
