export function readPasswordRecoveryCallback(hash = '') {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return {
    requested: params.get('type') === 'recovery',
    failed: Boolean(params.get('error') || params.get('error_code') || params.get('error_description')),
  };
}

export async function requestPasswordRecovery(auth, email) {
  if (!auth) throw new Error('La recuperación por correo no está disponible en el modo local.');
  const { error } = await auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) throw error;
}

export async function saveRecoveredPassword(auth, password, confirmation) {
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
  if (!auth) throw new Error('Solicita un nuevo enlace de recuperación.');
  const { error } = await auth.updateUser({ password });
  if (error) throw error;
}
