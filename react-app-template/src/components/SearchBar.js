import React, { useState } from "react";
import { Search } from "lucide-react"; // 🔍 magnifying glass icon

function SearchBar({ onResults }) {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch(
        `/api/appointments/user/search?keyword=${encodeURIComponent(
          keyword
        )}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      onResults(data, true);
    } catch (err) {
      console.error(err);
      onResults([]); // clear results on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSearch}>
      <button type="submit" className="search-btn" disabled={loading} title="Search">
        {loading ? "…" : <Search size={18} />}
      </button>
      <input
        type="text"
        placeholder="Search appointments..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
    </form>
  );
}

export default SearchBar;
