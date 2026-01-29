(() => {
  const SUPABASE_URL = "https://dqstskgvdiwdkonbapke.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc3Rza2d2ZGl3ZGtvbmJhcGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMDI0NzYsImV4cCI6MjA3NTg3ODQ3Nn0.2iFEYtVQZjQOY8_sF4x0SvWIKk8L-jg4yzpXzLLFe60";

  function getSupabaseClient() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return null;
  }

  const supabaseClient = getSupabaseClient();
  const resetBtn = document.getElementById('resetBtn');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const resetError = document.getElementById('resetError');
  const resetSuccess = document.getElementById('resetSuccess');

  if (!supabaseClient) {
    resetError.textContent = 'Password reset is unavailable. Please check your connection and refresh.';
    resetError.style.display = 'block';
    resetBtn.disabled = true;
    return;
  }

  resetBtn.addEventListener('click', async () => {
    resetError.style.display = 'none';
    resetSuccess.style.display = 'none';

    const pwd = newPassword.value.trim();
    const confirm = confirmPassword.value.trim();

    if (!pwd || !confirm) {
      resetError.textContent = 'Please fill in both fields.';
      resetError.style.display = 'block';
      return;
    }

    if (pwd.length < 6) {
      resetError.textContent = 'Password must be at least 6 characters.';
      resetError.style.display = 'block';
      return;
    }

    if (pwd !== confirm) {
      resetError.textContent = 'Passwords do not match.';
      resetError.style.display = 'block';
      return;
    }

    resetBtn.textContent = 'Updating…';
    resetBtn.disabled = true;

    try {
      const { error } = await supabaseClient.auth.updateUser({ password: pwd });
      if (error) {
        resetError.textContent = error.message || 'Unable to update password.';
        resetError.style.display = 'block';
        return;
      }
      resetSuccess.style.display = 'block';
      newPassword.value = '';
      confirmPassword.value = '';
      setTimeout(() => { window.location.href = '/login/'; }, 1200);
    } catch (err) {
      console.error('Reset error:', err);
      resetError.textContent = 'Unexpected error. Please try again.';
      resetError.style.display = 'block';
    } finally {
      resetBtn.textContent = 'Update Password';
      resetBtn.disabled = false;
    }
  });
})();
