import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";

import robot from "../assets/robot.png";
import { cn } from "../utils/cn.js";

export const ChatArea = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [maxLength, setMaxLength] = useState(20);

  useEffect(() => {
    const updateMaxLength = () => {
      setMaxLength(window.innerWidth >= 1280 ? 80 : 20);
    };

    updateMaxLength();
    window.addEventListener("resize", updateMaxLength);

    window.scrollTo(0, 0);

    return () => {
      window.removeEventListener("resize", updateMaxLength);
    };
  }, []);

  const {
    data: chatroomsData,
    error: chatroomsError,
    isLoading,
  } = useQuery({
    queryKey: ["chatrooms"],
    queryFn: async () => {
      const response = await fetch("/api/chatrooms/chats");
      if (!response.ok) {
        throw new Error("Failed to fetch chatrooms");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["chatrooms"], data);
    },
    onError: (error) => {
      console.error(error.message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/logout`, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error("Failed to logout");
      }
      return response.json();
    },
    onSuccess: () => {
      navigate("/");
    },
    onError: (error) => {
      console.error("Failed to logout", error);
    },
  });

  useEffect(() => {
    const socket = io(import.meta.env.VITE_REACT_APP_SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on("message", () => {
      queryClient.invalidateQueries(["chatrooms"]);
    });

    socket.on("message-updated", () => {
      queryClient.invalidateQueries(["chatroom"]);
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return (
    <div className="[scrollbar-width:thin]">
      <header className="flex justify-between items-center sticky top-0 z-50 bg-gray-700 xl:p-2">
        <h1 className=" flex items-center tracking-widest text-sm md:text-base xl:text-3xl ml-2">
          Hello, Word!
        </h1>
        <img
          className="h-12 absolute left-1/2 transform -translate-x-1/2 xl:h-16"
          src={robot}
          alt="robot"
        />
        <div className="relative">
          <div
            className="cursor-pointer flex flex-col items-center"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <div className="relative aspect-square h-8 xl:h-12 border-2 bg-gray-400 rounded-full mt-2 mr-2 overflow-hidden hover:scale-120 duration-300">
              <img
                className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 hover:scale-170"
                src={
                  chatroomsData?.currentUsername
                    ? `https://robohash.org/${chatroomsData?.currentUsername}`
                    : robot
                }
                alt="avatar"
              />
            </div>
            <span className="mr-2 xl:text-xl">
              {chatroomsData?.currentUsername}
            </span>
          </div>

          {/* Settings Menu */}
          {menuOpen && (
            <ul className="border-gray-300 border-l-2 border-b-2 bg-gray-700 absolute right-0 backdrop-blur-xs rounded-bl-2xl shadow-lg z-999 duration-1000">
              <li
                className="hover:bg-gray-600 cursor-pointer  text-white font-extrabold duration-300  px-3 py-1 md:px-8"
                // onClick={() => navigate(`/`)}
              >
                Profile
              </li>
              <li
                className="hover:bg-gray-600 cursor-pointer text-white  font-extrabold  duration-300  px-3 py-1 md:px-8"
                onClick={() => navigate(`/settings`)}
              >
                Settings
              </li>
              <li
                className="hover:bg-gray-600 cursor-pointer text-white  font-extrabold  duration-300  px-3 py-1 md:px-8 text-nowrap"
                // onClick={() => navigate(`/`)}
              >
                Delete Chat
              </li>
              <li
                className="hover:bg-gray-600 cursor-pointer text-white 
                duration-300 text-xs  px-3 py-1 md:px-8 text-nowrap"
                // onClick={() => navigate(`/`)}
              >
                About us
              </li>
              <li
                className="hover:bg-gray-600 cursor-pointer text-white 
                duration-300 text-xs  px-3 py-1 md:px-8 text-nowrap"
                // onClick={() => navigate(`/`)}
              >
                Legal
              </li>
              <li
                className="hover:bg-gray-600 rounded-bl-2xl cursor-pointer text-red-600 font-extrabold  duration-300 px-3 py-1 md:px-8 outline-none"
                onClick={() => logoutMutation.mutate()}
              >
                Logout
              </li>
            </ul>
          )}
        </div>
      </header>
      <main className="min-h-screen">
        {isLoading ? (
          <p>Loading...</p>
        ) : chatroomsError ? (
          <p>Error loading chatrooms: {chatroomsError.message}</p>
        ) : (
          <>
            <ul>
              {chatroomsData?.chatrooms.map((chatroom) => (
                <Link
                  key={chatroom.chatId}
                  to={`/chatarea/chats/${chatroom.chatId}`}
                >
                  <li className="flex p-2 border-t-1 hover:bg-gray-600 duration-300">
                    <div className="relative aspect-square h-12 xl:h-20 border-2 bg-gray-700 rounded-full overflow-hidden">
                      <img
                        className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 hover:scale-150"
                        src={
                          chatroom.usernames.join(", ")
                            ? `https://robohash.org/${chatroom.usernames.join(", ")}`
                            : robot
                        }
                        alt="avatar"
                      />
                    </div>
                    <div className="flex flex-col pl-2">
                      <span className="font-bold">
                        {chatroom.usernames.join(", ") ?? "No Username"}
                      </span>
                      {chatroom.usernames.join(", ")
                        ? chatroom.lastMessage && (
                            <span className="text-xs xl:text-xl">
                              {truncateText(
                                chatroom.lastMessage.content,
                                maxLength
                              )}
                            </span>
                          )
                        : "Deleted account"}
                    </div>
                    <div className="ml-auto">
                      {chatroom.timestamps &&
                        chatroom.timestamps.length > 0 && (
                          <span className="flex justify-end text-gray-400 text-xs">
                            {formatTimestamp(chatroom.timestamps[0])}
                          </span>
                        )}
                      {chatroom.unreadMessagesCount > 0 && (
                        <div className="text-amber-400 border-2 rounded-full px-2 flex items-center justify-center w-8 h-8 mt-1">
                          <span className="animate-pulse">
                            {chatroom.unreadMessagesCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                </Link>
              ))}
            </ul>
            <button
              className="xl:h-20 xl:w-30 xl:bottom-4 xl:right-4 justify-center cursor-pointer fixed bottom-2 right-2 flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              onClick={() => navigate("/chatarea/exist")}
            >
              <span
                className="material-symbols-outlined text-gray-200"
                style={{ fontSize: "36px" }}
              >
                person_add
              </span>
            </button>
          </>
        )}
      </main>
    </div>
  );
};

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(date)
      .replace(",", "");
  }
}

function truncateText(text, maxLength) {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "…";
  }
  return text;
}
