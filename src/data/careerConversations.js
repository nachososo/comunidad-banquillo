// Lines and senders supplied by the user for the fictional in-game welcome.
// Times are scene timestamps, not metadata from the real WhatsApp group.
// Messages: { id, sender, text, time, tone: 'blue' | 'green' | 'purple' }.
// text can use regular o/a or os/as markers, or full { masculino, femenino } variants.
// Variants only change how the player is addressed, not who sends the message.
// Additional in-game senders explicitly supplied by the user. These are not
// player-stat records and must not change the site's sporting roster.
export const CAREER_ADDITIONAL_MEMBERS = [
  { id: 'cdb-irene-crecis', name: 'Irene Crecis' },
  { id: 'cdb-briseida-batalla', name: 'Briseida Batalla' },
  { id: 'cdb-gonzalo-carretero', name: 'Gonzalo Carretero' },
  { id: 'cdb-nacho-serrano', name: 'Nacho Serrano' },
  { id: 'cdb-daniel-bastardo', name: 'Daniel Bastardo' },
];

export const CAREER_WELCOME_MESSAGES = [
  { id: 'welcome-carlos', sender: 'Carlos Torres', text: '¡Bienvenido/a al equipo!', time: '18:09', tone: 'blue' },
  { id: 'welcome-dani', sender: 'Dani González', text: 'Bienvenido/a  🫶', time: '18:09', tone: 'green' },
  { id: 'welcome-unai', sender: 'Unai Suárez', text: 'Aquí no se da la bienvenida hasta que respondas a esta pregunta. ¿Qué opinas de la serie Los Anillos de Poder?', time: '18:10', tone: 'purple' },
  { id: 'welcome-javier', sender: 'Javier Torres', text: '¡Bienvenido/a! Te explico las normas básicas: pasarlo bien y no hacer antideportivas a tus compañeros/as de equipo (a los rivales opcional).', time: '18:10', tone: 'blue' },
];
