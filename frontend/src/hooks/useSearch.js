import { useState, useCallback } from "react";
import { api } from "../services/api";

export function useSearch() {
  const [headerSearch, setHeaderSearch] = useState("");
  const [searchResults, setSearchResults] = useState({ posts: [], subreddits: [], users: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  
  const [memberSearch, setMemberSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const runSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults({ posts: [], subreddits: [], users: [] });
      return;
    }
    setSearchLoading(true);
    try {
      const data = await api.search(query);
      if (data.ok) {
        setSearchResults({
          posts: data.results?.posts || [],
          subreddits: data.results?.subreddits || [],
          users: data.results?.users || []
        });
      }
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const searchMembers = useCallback(async (query) => {
    setMembersLoading(true);
    try {
      const data = await api.getUsers(query);
      setMembers(data.users || []);
    } catch (err) {
    } finally {
      setMembersLoading(false);
    }
  }, []);

  return {
    headerSearch,
    setHeaderSearch,
    searchResults,
    searchLoading,
    searchError,
    runSearch,
    memberSearch,
    setMemberSearch,
    members,
    membersLoading,
    searchMembers
  };
}
