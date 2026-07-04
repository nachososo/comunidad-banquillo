import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import GameStart from '@/components/eighteenZero/GameStart.jsx';
import DraftRound from '@/components/eighteenZero/DraftRound.jsx';
import ResultScreen from '@/components/eighteenZero/ResultScreen.jsx';
import CoachSelection from '@/components/eighteenZero/CoachSelection.jsx';
import { DRAFT_POSITIONS } from '@/data/cdbPlayers.js';
import { buildEventEffect, getRandomSeasonEvents } from '@/data/cdbEvents.js';
import { calculateTeamScore } from '@/utils/calculateTeamScore.js';
import { getRandomDraftOptions } from '@/utils/getRandomDraftOptions.js';
import {
  getStoredEighteenZeroChemistryLinks,
  getStoredEighteenZeroCoaches,
  getStoredEighteenZeroEvents,
  getStoredEighteenZeroPlayers,
} from '@/utils/eighteenZeroStorage.js';
import { loadEighteenZeroBundle } from '@/lib/gameDataRepository.js';

const EighteenZeroPage = () => {
  const [phase, setPhase] = useState('start');
  const [currentPosition, setCurrentPosition] = useState(null);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [result, setResult] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState(() => getStoredEighteenZeroPlayers());
  const [seasonEvents, setSeasonEvents] = useState(() => getStoredEighteenZeroEvents());
  const [playerChemistryLinks, setPlayerChemistryLinks] = useState(() => getStoredEighteenZeroChemistryLinks());
  const [coaches, setCoaches] = useState(() => getStoredEighteenZeroCoaches());

  useEffect(() => {
    let active = true;
    loadEighteenZeroBundle({
      players: getStoredEighteenZeroPlayers(),
      events: getStoredEighteenZeroEvents(),
      skills: [],
      chemistry: getStoredEighteenZeroChemistryLinks(),
      coaches: getStoredEighteenZeroCoaches(),
    }).then((bundle) => {
      if (!active) return;
      setPlayers(bundle.players);
      setSeasonEvents(bundle.events);
      setPlayerChemistryLinks(bundle.chemistry);
      setCoaches(bundle.coaches);
    });
    return () => { active = false; };
  }, []);

  const roundIndex = selectedPlayers.length;
  const selectedKey = selectedPlayers.map((player) => player.id).join('|');
  const filledPositions = new Set(selectedPlayers.map((player) => player.draftPosition));
  const availablePositions = DRAFT_POSITIONS.filter((position) => !filledPositions.has(position));

  const options = useMemo(
    () => {
      if (!currentPosition) return [];

      return getRandomDraftOptions({
        players,
        position: currentPosition,
        selectedIds: selectedPlayers.map((player) => player.id),
        selectedPersonIds: selectedPlayers.map((player) => player.personId || player.id),
      });
    },
    [currentPosition, selectedKey, players],
  );

  const startDraft = () => {
    setPhase('draft');
    setCurrentPosition(null);
    setSelectedPlayers([]);
    setResult(null);
    setSelectedCoach(null);
    setError('');
  };

  const handleChoosePosition = (position) => {
    setCurrentPosition(position);
    setError('');
  };

  const handleSelect = (player) => {
    if (!currentPosition || player.position !== currentPosition) {
      setError(`Este jugador solo puede ser elegido como ${player.position}.`);
      return;
    }

    if (selectedPlayers.some((selected) => (selected.personId || selected.id) === (player.personId || player.id))) {
      setError('No puedes elegir dos versiones de la misma persona en el quinteto.');
      return;
    }

    const nextTeam = [...selectedPlayers, { ...player, draftPosition: currentPosition }];
    setSelectedPlayers(nextTeam);
    setError('');

    if (nextTeam.length === DRAFT_POSITIONS.length) {
      setPhase('coach');
      return;
    }

    setCurrentPosition(null);
  };

  const handleSelectCoach = (coach) => {
    const randomEvents = getRandomSeasonEvents(seasonEvents, selectedPlayers);
    const coachEvent = { ...coach.event, effect: buildEventEffect(coach.event), guaranteedByCoach: true };
    const randomFactor = Math.floor(Math.random() * 7) - 3;
    setSelectedCoach(coach);
    setResult(calculateTeamScore({ team: selectedPlayers, selectedEvents: [coachEvent, ...randomEvents], randomFactor, playerChemistryLinks }));
    setPhase('result');
  };

  return (
    <>
      <Helmet>
        <title>18-0 | La Comunidad del Banquillo</title>
        <meta
          name="description"
          content="Construye un quinteto del CDB y busca la temporada perfecta en 18-0."
        />
      </Helmet>
      <div className="min-h-screen bg-[#070707] text-white">
        <Header />
        <main className="relative overflow-hidden py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(212,175,55,0.14),transparent_28%),radial-gradient(circle_at_80%_35%,rgba(255,255,255,0.07),transparent_24%)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {phase === 'start' && <GameStart onStart={startDraft} />}
            {phase === 'draft' && (
              <DraftRound
                availablePositions={availablePositions}
                error={error}
                options={options}
                position={currentPosition}
                roundIndex={roundIndex}
                selectedPlayers={selectedPlayers}
                totalRounds={DRAFT_POSITIONS.length}
                onChoosePosition={handleChoosePosition}
                onSelect={handleSelect}
              />
            )}
            {phase === 'coach' && <CoachSelection coaches={coaches} onSelect={handleSelectCoach} />}
            {phase === 'result' && result && (
              <ResultScreen team={selectedPlayers} coach={selectedCoach} result={result} onRestart={startDraft} />
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default EighteenZeroPage;
