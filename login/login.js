
    (() => {
      function hasCompletedSetup() {
        try {
          const raw = localStorage.getItem('uoft_onboarding_v1');
          if (!raw) return false;
          const data = JSON.parse(raw);
          return !!(data && data.university && data.year && data.program);
        } catch (err) {
          return false;
        }
      }
      const cachedAuth = (() => {
        try {
          return JSON.parse(localStorage.getItem('uoft_auth_v1') || 'null');
        } catch (err) {
          return null;
        }
      })();

      if (cachedAuth && cachedAuth.loggedIn && cachedAuth.username) {
        window.location.replace(hasCompletedSetup() ? '/main/' : '/setup/');
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
    const resetSuccess = document.getElementById('resetSuccess');
    const forgotPasswordBtn = document.getElementById('forgotPassword');
    const backToLoginBtn = document.getElementById('backToLogin');
    const sendResetBtn = document.getElementById('sendResetBtn');
    let failedAttempts = 0;

    function enterResetMode() {
      document.body.classList.add('reset-mode');
      if (resetSuccess) resetSuccess.style.display = 'none';
      loginError.style.display = 'none';
      if (forgotPasswordBtn) forgotPasswordBtn.style.display = 'none';
      if (backToLoginBtn) backToLoginBtn.style.display = 'inline-flex';
      if (sendResetBtn) sendResetBtn.style.display = 'inline-flex';
      usernameInputEl.placeholder = 'Email or username';
    }

    function exitResetMode() {
      document.body.classList.remove('reset-mode');
      if (resetSuccess) resetSuccess.style.display = 'none';
      loginError.style.display = 'none';
      if (failedAttempts >= 2 && forgotPasswordBtn) {
        forgotPasswordBtn.style.display = 'inline-flex';
      }
      if (backToLoginBtn) backToLoginBtn.style.display = 'none';
      if (sendResetBtn) sendResetBtn.style.display = 'none';
      usernameInputEl.placeholder = 'Username';
    }

    const usernameInputEl = document.getElementById('username');
    const passwordInputEl = document.getElementById('password');

    loginBtn.addEventListener('click', async () => {
      console.log('Login button clicked');
      const usernameOrEmail = usernameInputEl.value.trim();
      const password = passwordInputEl.value.trim();

      loginError.style.display = 'none';
      if (resetSuccess) resetSuccess.style.display = 'none';

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
          failedAttempts += 1;
          if (forgotPasswordBtn && failedAttempts >= 2) {
            forgotPasswordBtn.style.display = 'inline-flex';
          }
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
        failedAttempts = 0;
        if (forgotPasswordBtn) {
          forgotPasswordBtn.style.display = 'none';
        }

        
        window.location.href = hasCompletedSetup() ? '/main/' : '/setup/';
      } catch (err) {
        console.error('Login error:', err);
        loginError.textContent = 'Unexpected error. Please try again.';
        loginError.style.display = 'block';
      } finally {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
      }
    });

    forgotPasswordBtn?.addEventListener('click', () => {
      enterResetMode();
    });

    sendResetBtn?.addEventListener('click', async () => {
      const usernameOrEmail = usernameInputEl.value.trim();
      loginError.style.display = 'none';
      if (resetSuccess) resetSuccess.style.display = 'none';

      if (!supabaseClient) {
        supabaseClient = getSupabaseClient();
      }
      if (!supabaseClient) {
        loginError.textContent = 'Password reset is unavailable. Please check your connection and refresh.';
        loginError.style.display = 'block';
        return;
      }
      if (!usernameOrEmail) {
        loginError.textContent = 'Enter your email or username to reset your password.';
        loginError.style.display = 'block';
        return;
      }

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
          emailToUse = usernameOrEmail;
        }

        const { error } = await supabaseClient.auth.resetPasswordForEmail(emailToUse, {
          redirectTo: `${window.location.origin}/reset-password/`
        });

        if (error) {
          loginError.textContent = error.message || 'Unable to send reset email.';
          loginError.style.display = 'block';
          return;
        }

        if (resetSuccess) resetSuccess.style.display = 'block';
      } catch (err) {
        console.error('Reset error:', err);
        loginError.textContent = 'Unexpected error. Please try again.';
        loginError.style.display = 'block';
      }
    });

    backToLoginBtn?.addEventListener('click', () => {
      exitResetMode();
    });
    })();
  
