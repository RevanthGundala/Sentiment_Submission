import { useEffect, useState } from "react";

export default function TreePage() {
  const [backendData, setBackendData] = useState([]);

  useEffect(() => {
    fetch("/api").then((response) => response.json()).then((data) => setBackendData(data.users));
  }, []);

  return (
    <div>
      <div>
        {backendData.length === 0 ? (
          <div>Loading...</div>
        ) : (
          backendData.map((user, i) => <p key={i}>{user}</p>)
        )}
      </div>
    </div>
  );
}


