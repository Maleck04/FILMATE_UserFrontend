import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from './Header.jsx';
import { Eye, Film, Heart, MessageSquareText, PencilLine, Search, ThumbsUp, UserPlus } from 'lucide-react';
import { getAuthSession } from './authSession';
import {
  followUser,
  getFollowing,
  getMovieById,
  getSocialSummary,
  getUserInteractions,
  getUserRatedMovies,
  getUserRatingDistribution,
  getUserReviews,
  searchMovies,
  searchUsers,
  unfollowUser,
} from './filmateApi';

const FALLBACK_POSTER = 'https://placehold.co/400x600/0f172a/f8fafc?text=Filmate';
const DEFAULT_RATING_DISTRIBUTION = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const PROFILE_FAVORITES_PREFIX = 'filmate.social.profileFavorites.';

const tabs = ['Perfil', 'Peliculas', 'Listas', 'Actividad', 'Reseñas', 'Favoritos'];

const getUserId = (user) => user?.id_usuario || user?.id || user?.user_id || null;
const isSameUser = (firstId, secondId) => String(firstId || '') === String(secondId || '');
const getProfileFavoritesCacheKey = (userId) => `${PROFILE_FAVORITES_PREFIX}${userId}`;
const readProfileFavoritesCache = (userId) => {
  if (!userId) return [];

  try {
    const rawFavorites = window.localStorage.getItem(getProfileFavoritesCacheKey(userId));
    return rawFavorites ? JSON.parse(rawFavorites) : [];
  } catch {
    return [];
  }
};
const getRelatedUserId = (item) => (
  item?.id_usuario_seguido ||
  item?.id_seguido ||
  item?.seguido_id ||
  item?.seguido?.id_usuario ||
  item?.seguido?.id ||
  item?.usuario_seguido?.id_usuario ||
  item?.usuario_seguido?.id ||
  getUserId(item)
);

const getDisplayName = (user, isRegistered) => {
  if (!isRegistered) return 'Invitado';

  return (
    user?.username ||
    user?.nombreUsuario ||
    'usuario'
  );
};

const getBioText = (profile, isRegistered) => {
  if (!isRegistered) {
    return 'Estas navegando como invitado. Inicia sesion para cargar tu perfil social.';
  }

  return (
    profile?.bio ||
    profile?.descripcion ||
    profile?.presentacion ||
    'Aun no tienes una bio publica configurada.'
  );
};

const formatStat = (value) => String(Number.isFinite(value) ? value : 0);

const formatActivityDate = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getValidRating = (rating) => {
  const numericRating = Number(rating);
  if (!Number.isFinite(numericRating)) return null;

  return Math.min(5, Math.max(1, numericRating));
};

const getRatingDistributionFromItems = (items) => {
  const distribution = { ...DEFAULT_RATING_DISTRIBUTION };

  items.forEach((item) => {
    const rating = Math.round(getValidRating(item.rating) || 0);
    if (rating >= 1 && rating <= 5) distribution[rating] += 1;
  });

  return distribution;
};

export const Social = () => {
  const navigate = useNavigate();
  const { profileUserId } = useParams();
  const [session] = useState(() => getAuthSession());
  const sessionUser = session?.user;
  const isRegistered = session?.mode === 'registered';
  const userId = getUserId(sessionUser);
  const viewedUserId = profileUserId || userId;
  const isOwnProfile = isSameUser(viewedUserId, userId);
  const shouldLoadSocial = Boolean(isRegistered && viewedUserId);

  const [profile, setProfile] = useState(isOwnProfile ? sessionUser || null : null);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [socialStatsData, setSocialStatsData] = useState({
    totalMovies: 0,
    totalReviews: 0,
    followers: 0,
    following: 0,
  });
  const [ratingDistribution, setRatingDistribution] = useState(DEFAULT_RATING_DISTRIBUTION);
  const [ratedMovies, setRatedMovies] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [activityItems, setActivityItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [watchedMoviesCount, setWatchedMoviesCount] = useState(0);
  const [activeTab, setActiveTab] = useState('Perfil');
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [watchedLoading, setWatchedLoading] = useState(false);
  const [interactionFavoriteMovies, setInteractionFavoriteMovies] = useState([]);
  const [interactionFavoritesLoading, setInteractionFavoritesLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [movieSearchResults, setMovieSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState('');
  const [movieSearchError, setMovieSearchError] = useState('');
  const [loading, setLoading] = useState(shouldLoadSocial);
  const [loadError, setLoadError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState('');
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('');

  useEffect(() => {
    let active = true;

    if (!shouldLoadSocial) {
      return () => {
        active = false;
      };
    }

    const resetTimer = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setLoadError('');
      setFollowError('');
      setIsFollowing(false);
      setProfile(isOwnProfile ? sessionUser || null : null);
      setFavoriteMovies([]);
      setRatedMovies([]);
      setUserReviews([]);
      setActivityItems([]);
      setWatchedMoviesCount(0);
      setRatingDistribution(DEFAULT_RATING_DISTRIBUTION);
      setSocialStatsData({
        totalMovies: 0,
        totalReviews: 0,
        followers: 0,
        following: 0,
      });
    }, 0);

    Promise.allSettled([
      getSocialSummary(viewedUserId),
      getUserRatingDistribution(viewedUserId),
      getUserRatedMovies(viewedUserId),
      getUserReviews(viewedUserId),
      getUserInteractions(viewedUserId),
      !isOwnProfile && userId ? getFollowing(userId) : Promise.resolve([]),
    ])
      .then(([summaryResult, ratingResult, ratedMoviesResult, reviewsResult, interactionsResult, followingResult]) => {
        if (!active) return;

        if (summaryResult.status === 'fulfilled' && summaryResult.value) {
          const summary = summaryResult.value;
          if (summary.profile) setProfile(summary.profile);
          setSocialStatsData(summary.stats);
          const cachedFavorites = isOwnProfile ? readProfileFavoritesCache(viewedUserId) : [];
          setFavoriteMovies((cachedFavorites.length ? cachedFavorites : summary.favoriteMovies).slice(0, 5));
        }

        if (ratingResult.status === 'fulfilled') setRatingDistribution(ratingResult.value);
        if (ratedMoviesResult.status === 'fulfilled') setRatedMovies(ratedMoviesResult.value);
        if (reviewsResult.status === 'fulfilled') setUserReviews(reviewsResult.value);
        if (interactionsResult.status === 'fulfilled') {
          setWatchedMoviesCount(interactionsResult.value.filter((item) => item.vista).length);
        }
        if (followingResult.status === 'fulfilled') {
          setIsFollowing(followingResult.value.some((item) => isSameUser(getRelatedUserId(item), viewedUserId)));
        }

        const hasFailure = [
          summaryResult,
          ratingResult,
          ratedMoviesResult,
          reviewsResult,
          interactionsResult,
        ].some((result) => result.status === 'rejected');

        if (hasFailure) {
          setLoadError('No se pudieron cargar todos los datos sociales. Mostrando la informacion disponible.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(resetTimer);
    };
  }, [isOwnProfile, sessionUser, shouldLoadSocial, userId, viewedUserId]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    let active = true;

    if (!shouldLoadSocial || normalizedQuery.length < 2) {
      const timer = window.setTimeout(() => {
        if (!active) return;
        setUserSearchResults([]);
        setMovieSearchResults([]);
        setSearchLoading(false);
        setUserSearchError('');
        setMovieSearchError('');
      }, 0);

      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }

    const timer = window.setTimeout(() => {
      if (!active) return;
      setSearchLoading(true);
      setUserSearchError('');
      setMovieSearchError('');

      Promise.allSettled([
        searchUsers(normalizedQuery),
        searchMovies(normalizedQuery),
      ])
        .then(([usersResult, moviesResult]) => {
          if (!active) return;

          if (usersResult.status === 'fulfilled') {
            setUserSearchResults(usersResult.value);
          } else {
            setUserSearchResults([]);
            setUserSearchError(usersResult.reason?.message || 'No se pudo buscar usuarios.');
          }

          if (moviesResult.status === 'fulfilled') {
            setMovieSearchResults(moviesResult.value);
          } else {
            setMovieSearchResults([]);
            setMovieSearchError(moviesResult.reason?.message || 'No se pudo buscar peliculas.');
          }
        })
        .finally(() => {
          if (active) setSearchLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, shouldLoadSocial]);

  useEffect(() => {
    if (activeTab !== 'Peliculas' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (active) setWatchedLoading(true);
    }, 0);

    getUserInteractions(viewedUserId)
      .then((interactions) => {
        if (!active) return;
        const watchedIds = interactions
          .filter((item) => item.vista)
          .map((item) => item.id_pelicula);

        setWatchedMoviesCount(watchedIds.length);
        return Promise.all(watchedIds.map((id) => getMovieById(id).catch(() => null)));
      })
      .then((movies) => {
        if (!active) return;
        setWatchedMovies((movies || []).filter(Boolean));
      })
      .catch(() => {
        if (active) setWatchedMovies([]);
      })
      .finally(() => {
        if (active) setWatchedLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [activeTab, shouldLoadSocial, viewedUserId]);

  useEffect(() => {
    if (activeTab !== 'Favoritos' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (active) setInteractionFavoritesLoading(true);
    }, 0);

    getUserInteractions(viewedUserId)
      .then((interactions) => {
        if (!active) return;
        const favoriteIds = interactions
          .filter((item) => item.favorita)
          .map((item) => item.id_pelicula);

        return Promise.all(favoriteIds.map((id) => getMovieById(id).catch(() => null)));
      })
      .then((movies) => {
        if (!active) return;
        setInteractionFavoriteMovies((movies || []).filter(Boolean));
      })
      .catch(() => {
        if (active) setInteractionFavoriteMovies([]);
      })
      .finally(() => {
        if (active) setInteractionFavoritesLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [activeTab, shouldLoadSocial, viewedUserId]);

  useEffect(() => {
    if (activeTab !== 'Reseñas' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (active) setReviewsLoading(true);
    }, 0);

    getUserReviews(viewedUserId)
      .then((reviews) => {
        if (!active) return;
        setUserReviews(reviews);
      })
      .catch(() => {
        if (active) setUserReviews([]);
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [activeTab, shouldLoadSocial, viewedUserId]);

  useEffect(() => {
    if (activeTab !== 'Actividad' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (active) setActivityLoading(true);
    }, 0);

    Promise.allSettled([
      getUserReviews(viewedUserId),
      getUserInteractions(viewedUserId),
      getFollowing(viewedUserId),
    ])
      .then(async ([reviewsResult, interactionsResult, followingResult]) => {
        if (!active) return;

        const reviews = reviewsResult.status === 'fulfilled' ? reviewsResult.value : [];
        const interactions = interactionsResult.status === 'fulfilled' ? interactionsResult.value : [];
        const following = followingResult.status === 'fulfilled' ? followingResult.value : [];
        const movieIds = [
          ...new Set(
            interactions
              .filter((item) => item.vista || item.favorita)
              .map((item) => item.id_pelicula)
              .filter(Boolean)
              .map(String)
          ),
        ];
        const movieEntries = await Promise.all(
          movieIds.map(async (movieId) => {
            try {
              return [movieId, await getMovieById(movieId)];
            } catch {
              return [movieId, null];
            }
          })
        );

        if (!active) return;

        const moviesById = Object.fromEntries(movieEntries);
        const reviewActivities = reviews.map((review) => ({
          id: `review-${review.id}`,
          type: 'review',
          icon: MessageSquareText,
          title: `Reseno ${review.movie?.titulo || 'una pelicula'}`,
          detail: review.texto || 'Sin comentario.',
          date: review.fechaPublicacion,
          movie: review.movie,
        }));
        const likeActivities = reviews
          .filter((review) => Number(review.likes || 0) > 0)
          .map((review) => ({
            id: `review-like-${review.id}`,
            type: 'like',
            icon: ThumbsUp,
            title: `${review.likes} ${Number(review.likes) === 1 ? 'like' : 'likes'} en su reseña`,
            detail: review.movie?.titulo || review.texto || 'Reseña de la comunidad.',
            date: review.fechaPublicacion,
            movie: review.movie,
          }));
        const interactionActivities = interactions.flatMap((item) => {
          const interactionMovie = moviesById[String(item.id_pelicula)];
          const items = [];

          if (item.favorita) {
            items.push({
              id: `favorite-${item.id_pelicula}`,
              type: 'favorite',
              icon: Heart,
              title: `Marco como favorita ${interactionMovie?.titulo || 'una pelicula'}`,
              detail: 'Agregada a su lista completa de favoritas.',
              date: item.fecha_favorito || item.fecha_actualizacion || item.fecha_creacion,
              movie: interactionMovie,
            });
          }

          if (item.vista) {
            items.push({
              id: `watched-${item.id_pelicula}`,
              type: 'watched',
              icon: Eye,
              title: `Marco como vista ${interactionMovie?.titulo || 'una pelicula'}`,
              detail: 'Registrada en peliculas vistas.',
              date: item.fecha_vista || item.fecha_actualizacion || item.fecha_creacion,
              movie: interactionMovie,
            });
          }

          return items;
        });
        const followingActivities = following.map((item) => {
          const followedName =
            item?.username ||
            item?.seguido?.username ||
            item?.usuario_seguido?.username ||
            item?.nombre_usuario ||
            `usuario ${getRelatedUserId(item) || ''}`.trim();

          return {
            id: `following-${getRelatedUserId(item) || followedName}`,
            type: 'following',
            icon: UserPlus,
            title: `Comenzo a seguir a @${String(followedName).replace(/^@/, '')}`,
            detail: 'Nueva conexion social.',
            date: item.fecha_seguimiento || item.fecha_creacion,
          };
        });

        setUserReviews(reviews);
        setActivityItems([
          ...reviewActivities,
          ...likeActivities,
          ...interactionActivities,
          ...followingActivities,
        ].sort((first, second) => {
          const firstDate = Date.parse(first.date || '') || 0;
          const secondDate = Date.parse(second.date || '') || 0;
          return secondDate - firstDate;
        }));
      })
      .catch(() => {
        if (active) setActivityItems([]);
      })
      .finally(() => {
        if (active) setActivityLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [activeTab, shouldLoadSocial, viewedUserId]);

  const profileFallback = isOwnProfile ? sessionUser : null;
  const displayName = getDisplayName(profile || profileFallback, isRegistered);
  const avatarUrl = profile?.url_perfil || profileFallback?.url_perfil || '';
  const bioText = getBioText(profile, isRegistered);
  const hasRealBio = Boolean(profile?.bio || profile?.descripcion || profile?.presentacion);
  const chartRatingItems = ratedMovies
    .map((item) => ({
      ...item,
      rating: getValidRating(item.rating),
    }))
    .filter((item) => item.rating !== null);
  const ratedMoviesDistribution = getRatingDistributionFromItems(chartRatingItems);
  const hasRatedMovieDistribution = chartRatingItems.length > 0;
  const chartDistribution = hasRatedMovieDistribution ? ratedMoviesDistribution : ratingDistribution;
  const maxRatingCount = Math.max(1, ...Object.values(chartDistribution).map((value) => Number(value) || 0));
  const totalRatings = Object.values(chartDistribution).reduce((sum, value) => sum + Number(value || 0), 0);
  const ratingBuckets = [1, 2, 3, 4, 5].map((rating) => {
    const count = Number(chartDistribution[rating] || 0);
    const movieLabel = count === 1 ? 'pelicula calificada' : 'peliculas calificadas';
    const label = count === 1 ? 'calificacion' : 'calificaciones';

    return {
      rating,
      count,
      label,
      movieLabel,
      tooltip: `${rating} estrellas: ${count} ${label}`,
      hoverText: String(count),
      height: 12 + (count / maxRatingCount) * 72,
    };
  });

  const socialStats = [
    { value: formatStat(watchedMoviesCount), label: 'Peliculas' },
    { value: formatStat(socialStatsData.following), label: 'Siguiendo' },
    { value: formatStat(socialStatsData.followers), label: 'Seguidores' },
  ];

  const normalizedSearchQuery = query.trim().toLowerCase();
  const displayedUserSearchResults = normalizedSearchQuery
    ? userSearchResults.filter((user) => String(user.username || '').toLowerCase().includes(normalizedSearchQuery))
    : userSearchResults;
  const displayedMovieSearchResults = movieSearchResults.slice(0, 8);
  const favoriteSlots = Array.from(
    { length: 5 },
    (_, index) => (loading ? null : favoriteMovies[index] || null)
  );

  const handleImageFallback = (event) => {
    event.currentTarget.src = FALLBACK_POSTER;
  };

  const handleSelectUser = (selectedUser) => {
    const selectedUserId = getUserId(selectedUser);
    if (!selectedUserId) return;

    setQuery('');
    setUserSearchResults([]);
    navigate(isSameUser(selectedUserId, userId) ? '/social' : `/social/${selectedUserId}`);
  };

  const handleSelectMovie = (movie) => {
    if (!movie?.id) return;

    setQuery('');
    setUserSearchResults([]);
    setMovieSearchResults([]);
    navigate(`/social/pelicula/${movie.id}`, { state: { movie } });
  };

  const handleFollow = () => {
    if (!userId || !viewedUserId || isOwnProfile || followLoading) return;

    setFollowLoading(true);
    setFollowError('');

    const nextFollowing = !isFollowing;
    const action = nextFollowing ? followUser : unfollowUser;

    action(userId, viewedUserId)
      .then(() => {
        setIsFollowing(nextFollowing);
        setSocialStatsData((currentStats) => ({
          ...currentStats,
          followers: Math.max(0, Number(currentStats.followers || 0) + (nextFollowing ? 1 : -1)),
        }));
      })
      .catch((error) => {
        setFollowError(error?.message || (nextFollowing ? 'No se pudo seguir este usuario.' : 'No se pudo dejar de seguir este usuario.'));
      })
      .finally(() => {
        setFollowLoading(false);
      });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#020b16] text-white">
      <Header />

      <main className="flex flex-1 flex-col">
        <section className="shrink-0 border-b border-sky-300/60 px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="mx-auto flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#211c1f] bg-white text-slate-900 shadow-lg shadow-black/20 sm:mx-0">
                  {avatarUrl && failedAvatarUrl !== avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      onError={() => setFailedAvatarUrl(avatarUrl)}
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#211c1f] text-white">
                      <span className="text-5xl leading-none">U</span>
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left">
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 sm:text-4xl">
                    @{displayName}
                  </h1>

                  {isOwnProfile ? (
                    <Link
                      to="/social/editarPerfil"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#2a6bb7] px-4 py-2 text-base font-bold text-white transition-colors hover:bg-[#2f77c9]"
                    >
                      <PencilLine className="h-4 w-4" />
                      {isRegistered ? 'Editar Perfil' : 'Modo invitado'}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-base font-bold text-white transition-colors disabled:cursor-wait ${
                        isFollowing ? 'bg-slate-700 hover:bg-red-700' : 'bg-[#2a6bb7] hover:bg-[#2f77c9]'
                      }`}
                    >
                      <UserPlus className="h-4 w-4" />
                      {followLoading ? 'Guardando...' : isFollowing ? 'Dejar de seguir' : 'Seguir'}
                    </button>
                  )}
                  {followError && (
                    <p className="mt-2 text-sm font-semibold text-red-200">{followError}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 lg:justify-self-end">
                <div className="relative ml-auto w-full max-w-sm">
                  <label className="flex w-full items-center overflow-hidden rounded-xl bg-[#2a6bb7] px-3 py-2 shadow-lg shadow-blue-900/20">
                    <Search className="h-5 w-5 shrink-0 text-black" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="ml-3 min-w-0 flex-1 bg-transparent text-lg font-bold text-white outline-none placeholder:text-white/70"
                      placeholder="Buscar usuarios o peliculas"
                    />
                  </label>

                  {query.trim().length >= 2 && (
                    <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-md border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40">
                      {searchLoading ? (
                        <p className="px-4 py-3 text-sm font-semibold text-white/65">Buscando usuarios y peliculas...</p>
                      ) : (
                        <div className="max-h-96 overflow-y-auto">
                          {userSearchError && (
                            <p className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-red-200">
                              {userSearchError}
                            </p>
                          )}

                          {movieSearchError && (
                            <p className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-red-200">
                              {movieSearchError}
                            </p>
                          )}

                          {displayedUserSearchResults.length > 0 && (
                            <section>
                              <p className="border-b border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-sky-200">
                                Usuarios
                              </p>
                              {displayedUserSearchResults.slice(0, 6).map((user) => (
                                <button
                                  key={user.id_usuario || user.id}
                                  type="button"
                                  onClick={() => handleSelectUser(user)}
                                  className="flex w-full items-center gap-3 border-b border-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-900"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800">
                                    {user.url_perfil ? (
                                      <img
                                        src={user.url_perfil}
                                        alt={user.username || 'Usuario'}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-sm font-black text-white/60">U</span>
                                    )}
                                  </div>
                                  <p className="min-w-0 truncate text-sm font-extrabold text-white">
                                    @{user.username || 'sin-username'}
                                  </p>
                                </button>
                              ))}
                            </section>
                          )}

                          {displayedMovieSearchResults.length > 0 && (
                            <section>
                              <p className="border-b border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-sky-200">
                                Peliculas
                              </p>
                              {displayedMovieSearchResults.map((movie) => (
                                <button
                                  key={movie.id}
                                  type="button"
                                  onClick={() => handleSelectMovie(movie)}
                                  className="flex w-full items-center gap-3 border-b border-slate-800 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-900"
                                >
                                  <div className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-800">
                                    {movie.imagenPoster ? (
                                      <img
                                        src={movie.imagenPoster}
                                        alt={movie.titulo}
                                        className="h-full w-full object-cover"
                                        onError={handleImageFallback}
                                      />
                                    ) : (
                                      <Film className="h-5 w-5 text-white/50" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-extrabold text-white">{movie.titulo}</p>
                                    <p className="truncate text-xs font-semibold text-white/50">
                                      {[movie.genero, movie.duracion].filter(Boolean).join(' - ')}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </section>
                          )}

                          {!userSearchError &&
                            !movieSearchError &&
                            displayedUserSearchResults.length === 0 &&
                            displayedMovieSearchResults.length === 0 && (
                              <p className="px-4 py-3 text-sm font-semibold text-white/65">Sin resultados encontrados.</p>
                            )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-0 text-center">
                  {socialStats.map((stat, index) => (
                    <div
                      key={stat.label}
                      className={`px-3 ${index !== socialStats.length - 1 ? 'border-r border-slate-500/80' : ''}`}
                    >
                      <p className="text-4xl font-black leading-none text-[#d8ced0]">{stat.value}</p>
                      <p className="mt-1 text-base font-medium text-[#c8c1c1]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {loadError && (
              <div className="mt-5 rounded-lg border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100">
                {loadError}
              </div>
            )}
          </div>
        </section>

        <section className="shrink-0 border-b border-sky-300/60 px-4 sm:px-6 lg:px-8">
          <div className="grid w-full grid-cols-2 gap-0 md:grid-cols-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                aria-current={tab === activeTab ? 'page' : undefined}
                onClick={() => setActiveTab(tab)}
                className={`border-x border-slate-800 py-4 text-base font-extrabold transition-colors sm:text-lg ${
                  tab === activeTab ? 'text-slate-100' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {activeTab === 'Perfil' && (
            <div className="grid w-full items-start gap-8 lg:grid-cols-[minmax(300px,0.32fr)_1fr]">
              <aside className="space-y-7">
                <div>
                  <h2 className="text-2xl font-bold text-white">Bio</h2>
                  <div className="mt-2 h-px w-full bg-white/60" />
                  <p className={`mt-3 text-lg font-semibold leading-snug ${hasRealBio ? 'text-white' : 'text-white/60'}`}>
                    {bioText}
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white">Clasificacion Personal</h2>
                  <div className="mt-2 h-px w-full bg-white/60" />
                  <div className="mt-8 grid min-h-32 w-full grid-cols-5 items-end gap-1 overflow-visible">
                    {ratingBuckets.map((bucket) => (
                      <div key={bucket.rating} className="group relative flex min-w-0 flex-col items-center gap-2">
                        <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 w-max max-w-36 -translate-x-1/2 rounded-md border border-white/20 bg-slate-950 px-2 py-1 text-center text-xs font-bold text-white opacity-0 shadow-lg shadow-black/40 transition-opacity group-hover:opacity-100">
                          {bucket.hoverText}
                        </div>
                        <div
                          className={`w-full rounded-t-full transition-opacity group-hover:opacity-70 ${bucket.count ? 'bg-[#ff2b50]' : 'bg-white/20'}`}
                          style={{ height: bucket.height }}
                          title={bucket.tooltip}
                        />
                        <span className="text-sm font-bold text-amber-400" title={bucket.tooltip}>
                          &#9733; {bucket.rating}
                        </span>
                      </div>
                    ))}
                  </div>
                  {totalRatings > 0 ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-white/55">
                        {totalRatings} calificaciones registradas.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-medium text-white/55">
                      Sin calificaciones disponibles.
                    </p>
                  )}
                </div>
              </aside>

              <div className="flex min-w-0 flex-col">
                <h2 className="mb-5 text-3xl font-extrabold text-slate-100">Peliculas Favoritas</h2>

                <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
                  {favoriteSlots.map((movie, index) => (
                    movie ? (
                      <article
                        key={`favorite-${movie.id}`}
                        className="group aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 transition-transform hover:-translate-y-1 hover:shadow-2xl"
                        title={movie.titulo}
                        onClick={() => navigate(`/social/pelicula/${movie.id}`, { state: { movie } })}
                      >
                        <img
                          src={movie.imagenPoster || FALLBACK_POSTER}
                          alt={movie.titulo}
                          className="h-full w-full object-cover"
                          onError={handleImageFallback}
                        />
                      </article>
                    ) : (
                      <div
                        key={`favorite-skeleton-${index}`}
                        className="aspect-[2/3] w-full overflow-hidden rounded-md border border-slate-800 bg-gradient-to-br from-slate-800/90 via-slate-900 to-slate-800/70"
                        aria-label={loading ? 'Cargando pelicula favorita' : 'Espacio de pelicula favorita disponible'}
                      >
                        <div className="h-full w-full bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.04)_45%,transparent_65%)]" />
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Peliculas' && (
            <div className="w-full">
              <h2 className="mb-5 text-3xl font-extrabold text-slate-100">Peliculas Vistas</h2>

              {watchedLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`watched-skeleton-${index}`}
                      className="aspect-[2/3] w-36 shrink-0 animate-pulse rounded-md border border-slate-800 bg-slate-800"
                    />
                  ))}
                </div>
              ) : watchedMovies.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {watchedMovies.map((movie) => (
                    <article
                      key={`watched-${movie.id}`}
                      className="group aspect-[2/3] w-36 shrink-0 cursor-pointer overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 transition-transform hover:-translate-y-1 hover:shadow-2xl"
                      title={movie.titulo}
                      onClick={() => navigate(`/social/pelicula/${movie.id}`, { state: { movie } })}
                    >
                      <img
                        src={movie.imagenPoster || FALLBACK_POSTER}
                        alt={movie.titulo}
                        className="h-full w-full object-cover"
                        onError={handleImageFallback}
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                  No hay peliculas vistas aun.
                </div>
              )}
            </div>
          )}

          {activeTab === 'Actividad' && (
            <div className="w-full">
              <h2 className="mb-5 text-3xl font-extrabold text-slate-100">Actividad</h2>

              {activityLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={`activity-skeleton-${index}`}
                      className="h-20 animate-pulse rounded-md border border-slate-800 bg-slate-900"
                    />
                  ))}
                </div>
              ) : activityItems.length > 0 ? (
                <div className="space-y-3">
                  {activityItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <article
                        key={item.id}
                        className="flex items-center gap-4 rounded-md border border-slate-800 bg-slate-900/45 px-4 py-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 text-sky-200">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">{item.title}</p>
                          <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/50">{item.detail}</p>
                        </div>
                        {item.movie?.imagenPoster && (
                          <button
                            type="button"
                            onClick={() => navigate(`/social/pelicula/${item.movie.id}`, { state: { movie: item.movie } })}
                            className="hidden h-14 w-10 shrink-0 overflow-hidden rounded border border-slate-800 sm:block"
                            aria-label={item.movie.titulo}
                          >
                            <img
                              src={item.movie.imagenPoster || FALLBACK_POSTER}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={handleImageFallback}
                            />
                          </button>
                        )}
                        <span className="hidden text-xs font-bold text-white/35 md:block">
                          {formatActivityDate(item.date)}
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                  Aun no hay actividad para mostrar.
                </div>
              )}
            </div>
          )}

          {activeTab === 'Reseñas' && (
            <div className="w-full">
              <h2 className="mb-5 text-3xl font-extrabold text-slate-100">Reseñas</h2>

              {reviewsLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`review-skeleton-${index}`}
                      className="h-40 animate-pulse rounded-md border border-slate-800 bg-slate-900"
                    />
                  ))}
                </div>
              ) : userReviews.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {userReviews.map((review) => (
                    <article
                      key={`user-review-${review.id}`}
                      className="rounded-md border border-slate-800 bg-slate-900/55 p-4"
                    >
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => review.movie?.id && navigate(`/social/pelicula/${review.movie.id}`, { state: { movie: review.movie } })}
                          className="h-24 w-16 shrink-0 overflow-hidden rounded border border-slate-800 bg-slate-950"
                          aria-label={review.movie?.titulo || 'Pelicula'}
                        >
                          {review.movie?.imagenPoster ? (
                            <img
                              src={review.movie.imagenPoster}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={handleImageFallback}
                            />
                          ) : (
                            <Film className="m-auto mt-8 h-6 w-6 text-white/35" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-base font-black text-white">
                                {review.movie?.titulo || 'Pelicula'}
                              </p>
                              <p className="mt-1 text-xs font-bold text-white/40">
                                {review.rating || 0}/5 - {formatActivityDate(review.fechaPublicacion)}
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-white/45">
                              <ThumbsUp className="h-3.5 w-3.5" />
                              {review.likes || 0}
                            </span>
                          </div>
                          <p className="mt-3 line-clamp-4 text-sm font-medium leading-relaxed text-white/65">
                            {review.texto || 'Sin comentario.'}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                  Este usuario aún no tiene reseñas.
                </div>
              )}
            </div>
          )}

          {activeTab === 'Favoritos' && (
            <div className="w-full">
              <div className="mb-5">
                <h2 className="text-3xl font-extrabold text-slate-100">Peliculas favoritas</h2>
                <p className="mt-2 text-sm font-semibold text-white/50">
                  Lista completa de peliculas marcadas como favoritas. Las 5 del perfil se editan aparte en Modificar perfil.
                </p>
              </div>

              {interactionFavoritesLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div
                      key={`favorite-list-skeleton-${index}`}
                      className="aspect-[2/3] animate-pulse rounded-md border border-slate-800 bg-slate-800"
                    />
                  ))}
                </div>
              ) : interactionFavoriteMovies.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
                  {interactionFavoriteMovies.map((movie) => (
                    <article
                      key={`favorite-list-${movie.id}`}
                      className="group cursor-pointer overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 transition-transform hover:-translate-y-1 hover:shadow-2xl"
                      title={movie.titulo}
                      onClick={() => navigate(`/social/pelicula/${movie.id}`, { state: { movie } })}
                    >
                      <img
                        src={movie.imagenPoster || FALLBACK_POSTER}
                        alt={movie.titulo}
                        className="aspect-[2/3] w-full object-cover"
                        onError={handleImageFallback}
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                  No hay peliculas favoritas en la lista completa.
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Social;

