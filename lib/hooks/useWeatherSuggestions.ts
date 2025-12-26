import { useState, useEffect } from "react";

export type WeatherSuggestion = {
  weatherType: "hot" | "rain" | "cold" | "moderate";
  weatherDescription: string;
  message: string;
  suggestedTasks: Array<{
    id?: string;
    title: string;
    cleanedTitle: string;
  }>;
  isNewTask?: boolean;
};

type WeatherSuggestionsState = {
  data: WeatherSuggestion | null;
  loading: boolean;
  error: string | null;
  shouldShow: boolean;
  apiError?: string;
};

const STORAGE_KEY = "weather-suggestions-login-count";

export function useWeatherSuggestions(): WeatherSuggestionsState {
  const [state, setState] = useState<WeatherSuggestionsState>({
    data: null,
    loading: false,
    error: null,
    shouldShow: false,
  });

  useEffect(function checkAndFetchWeatherSuggestions() {
    const alwaysOn =
      typeof window !== "undefined"
        ? localStorage.getItem("weather-always-on") === "1" ||
          process.env.NEXT_PUBLIC_WEATHER_ALWAYS_ON === "1"
        : false;

    let loginCount = 0;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        loginCount = parseInt(stored, 10) || 0;
      }
    } catch (error) {
      // Ignore localStorage errors
    }

    loginCount += 1;
    try {
      localStorage.setItem(STORAGE_KEY, loginCount.toString());
    } catch (error) {
      // Ignore localStorage errors
    }

    let shouldShow = false;
    if (alwaysOn) {
      shouldShow = true;
    } else {
      const randomInterval = Math.floor(Math.random() * 3) + 4;
      shouldShow = loginCount % randomInterval === 0;
    }

    if (!shouldShow) {
      setState({
        data: null,
        loading: false,
        error: null,
        shouldShow: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetch("/api/weather-suggestions")
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          setState({
            data: null,
            loading: false,
            error: data.error || "Failed to fetch weather suggestions",
            shouldShow: false,
          });
          return;
        }

        if (data.error) {
          setState({
            data: null,
            loading: false,
            error: null,
            shouldShow: false,
            apiError: data.error,
          });
          return;
        }

        setState({
          data: data as WeatherSuggestion,
          loading: false,
          error: null,
          shouldShow: true,
        });
      })
      .catch((error) => {
        setState({
          data: null,
          loading: false,
          error: error.message || "Failed to load weather suggestions",
          shouldShow: false,
        });
      });
  }, []);

  return state;
}
