
  (() => {
    
    const SUPABASE_URL = 'https://dqstskgvdiwdkonbapke.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc3Rza2d2ZGl3ZGtvbmJhcGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMDI0NzYsImV4cCI6MjA3NTg3ODQ3Nn0.2iFEYtVQZjQOY8_sF4x0SvWIKk8L-jg4yzpXzLLFe60';

    function getSupabaseClient() {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
      return null;
    }

    let supabaseClient = getSupabaseClient();

    
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

    
    document.querySelectorAll('.toggle-password').forEach(button => {
      button.addEventListener('click', () => {
        const input = button.previousElementSibling;
        if (input.type === 'password') {
          input.type = 'text';
          button.querySelector('ion-icon').setAttribute('name', 'eye-outline');
        } else {
          input.type = 'password';
          button.querySelector('ion-icon').setAttribute('name', 'eye-off-outline');
        }
      });
    });

    
    document.getElementById("signupForm").addEventListener("submit", async function(e) {
      e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    const usernameError = document.getElementById("usernameError");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");
    const successText = document.getElementById("successText");

    
    usernameError.style.display = emailError.style.display = passwordError.style.display = confirmPasswordError.style.display = "none";
    successText.style.display = "none";

    
    let hasError = false;

    if (!username) {
      usernameError.textContent = "Please enter a username.";
      usernameError.style.display = "block";
      hasError = true;
    }
    if (!email) {
      emailError.textContent = "Please enter your email.";
      emailError.style.display = "block";
      hasError = true;
    } else if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      emailError.textContent = "Invalid email address.";
      emailError.style.display = "block";
      hasError = true;
    }
    if (!password) {
      passwordError.textContent = "Please enter your password.";
      passwordError.style.display = "block";
      hasError = true;
    } else if (password.length < 6) {
      passwordError.textContent = "Password must be at least 6 characters.";
      passwordError.style.display = "block";
      hasError = true;
    }
    if (!confirmPassword) {
      confirmPasswordError.textContent = "Please confirm your password.";
      confirmPasswordError.style.display = "block";
      hasError = true;
    } else if (password !== confirmPassword) {
      confirmPasswordError.textContent = "Passwords do not match.";
      confirmPasswordError.style.display = "block";
      hasError = true;
    }
    if (hasError) return;

      if (!supabaseClient) {
        supabaseClient = getSupabaseClient();
      }

      if (!supabaseClient) {
        emailError.textContent = "Sign up is unavailable. Please check your connection and refresh.";
        emailError.style.display = "block";
        return;
      }

      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { username }
          }
        });

        if (error) {
          emailError.textContent = error.message || "Sign up failed.";
          emailError.style.display = "block";
          return;
        }

        
        if (data.user) {
          const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert({
              id: data.user.id,
              username: username,
              email: email
            });

          if (profileError) {
            console.error("Profile insert error:", profileError.message);
          }
        }

        if (canUseStorage) {
          localStorage.setItem("uoft_auth_v1", JSON.stringify({
            loggedIn: true,
            username,
            email
          }));
        }

        successText.textContent = "Account created! Redirecting...";
        successText.style.display = "block";

        setTimeout(() => {
          window.location.href = "/main/";
        }, 900);
      } catch (err) {
        emailError.textContent = err.message || "Unexpected error. Please try again.";
        emailError.style.display = "block";
      }
    });
  })();

