/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Flex,
  Icon,
  Avatar,
  InputGroup,
  InputRightElement,
  useToast,
} from "@chakra-ui/react";
import { FiSend, FiInfo, FiMessageCircle } from "react-icons/fi";
import UsersList from "./UsersList";
import { useEffect, useRef, useState } from "react";
import axios from "axios";

const ChatArea = ({ selectedGroup, socket }) => {
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const toast = useToast();

  const currentUser = JSON.parse(localStorage.getItem("userInfo") || {});

  useEffect(() => {
    if (selectedGroup && socket) {
      //fetch messages
      fetchMessages();

      socket.emit("join-room", selectedGroup._id);
      socket.on("message-received", (newMessage) => {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });
      socket.on("users-in-room", (users) => {
        setConnectedUsers(users);
      });

      socket.on("user-left", (userId) => {
        setConnectedUsers((prevUsers) =>
          prevUsers.filter((user) => user?._id !== userId),
        );
      });

      socket.on("notification", (notification) => {
        toast({
          title:
            notification?.type === "USER_JOINED" ? "New User" : "Notification",
          description: notification?.message,
          status: "info",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
      });

      socket.on("user-typing", (username) => {
        setTypingUsers((prevUsers) => new Set([...prevUsers, username]));
      });

      socket.on("user-stop-typing", (username) => {
        setTypingUsers(
          (prevUsers) =>
            new Set([...prevUsers].filter((user) => user !== username)),
        );
      });

      return () => {
        socket.emit("leave-room", selectedGroup._id);
        socket.off("message-received");
        socket.off("users-in-room");
        socket.off("user-left");
        socket.off("notification");
        socket.off("user-typing");
        socket.off("user-stop-typing");
      };
    }
  }, [selectedGroup, socket, toast]);

  //fetch messages
  const fetchMessages = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("userInfo") || {});
      const token = currentUser?.token;

      const { data } = await axios.get(
        `http://localhost:5000/api/messages/${selectedGroup?._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setMessages(data);
    } catch (error) {
      console.log(error);
      toast({
        title: "Error fetching messages",
        description: error.response.data.message || "Something went wrong",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  //send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const token = currentUser?.token;
      const { data } = await axios.post(
        `http://localhost:5000/api/messages`,
        {
          groupId: selectedGroup?._id,
          content: newMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      socket.emit("new-message", {
        ...data,
        groupId: selectedGroup?._id,
      });
      setMessages([...messages, data]);
      setNewMessage("");
    } catch (error) {
      console.log(error);
      toast({
        title: "Error sending message",
        description: error.response.data.message || "Something went wrong",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };
  //handleTyping
  const handleTyping = (e) => {
    console.log("event", e);
    setNewMessage(e.target.value);
    if (!isTyping && selectedGroup) {
      setIsTyping(true);
      socket.emit("typing", {
        groupId: selectedGroup?._id,
        username: currentUser?.username,
      });
      // Clear the typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedGroup) {
          socket.emit("stop-typing", {
            groupId: selectedGroup._id,
            username: currentUser?.username,
          });
        }
        setIsTyping(false);
      }, 2000);
    }
  };

  //format time
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  //render typing indicator
  console.log("messages", messages);
  const renderTypingIndicator = () => {
    if (typingUsers?.size > 0) {
      const typingUsersArray = Array.from(typingUsers);
      return typingUsersArray?.map((username) => {
        console.log("username", username);
        return (
          <Box
            key={username}
            alignSelf={
              username === currentUser?.username ? "flex-start" : "flex-end"
            }
            maxW="70%"
          >
            <Flex
              align="center"
              bg={username === currentUser?.username ? "blue.50" : "gray.50"}
              p={2}
              borderRadius="lg"
              gap={2}
            >
              {username === currentUser?.username ? (
                <>
                  <Avatar size="xs" name={username} />
                  <Flex gap={1}>
                    <Text fontSize="sm" color="gray.500" fontStyle="italic">
                      You are typing
                    </Text>
                    <Flex gap={1}>
                      {[1, 2, 3].map((dot) => (
                        <Box
                          key={dot}
                          w="3px"
                          h="3px"
                          borderRadius="full"
                          bg="gray.500"
                        ></Box>
                      ))}
                    </Flex>
                  </Flex>
                </>
              ) : (
                <>
                  <Flex gap={1}>
                    <Text fontSize="sm" color="gray.500" fontStyle="italic">
                      {username} is typing
                    </Text>
                    <Flex gap={1}>
                      {[1, 2, 3].map((dot) => (
                        <Box
                          key={dot}
                          w="3px"
                          h="3px"
                          borderRadius="full"
                          bg="gray.500"
                        ></Box>
                      ))}
                    </Flex>
                  </Flex>
                  <Avatar size="xs" name={username} />
                </>
              )}
            </Flex>
          </Box>
        );
      });
    }
  };

  return (
    <Flex h="100%" position="relative">
      <Box
        flex="1"
        display="flex"
        flexDirection="column"
        bg="gray.50"
        maxW={`calc(100% - 260px)`}
      >
        {/* Chat Header */}
        {selectedGroup ? (
          <>
            <Flex
              px={6}
              py={4}
              bg="white"
              borderBottom="1px solid"
              borderColor="gray.200"
              align="center"
              boxShadow="sm"
            >
              <Icon
                as={FiMessageCircle}
                fontSize="24px"
                color="blue.500"
                mr={3}
              />
              <Box flex="1">
                <Text fontSize="lg" fontWeight="bold" color="gray.800">
                  {selectedGroup.name}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {selectedGroup.description}
                </Text>
              </Box>
              <Icon
                as={FiInfo}
                fontSize="20px"
                color="gray.400"
                cursor="pointer"
                _hover={{ color: "blue.500" }}
              />
            </Flex>
            {/* Messages Area */}
            <VStack
              flex="1"
              overflowY="auto"
              spacing={4}
              align="stretch"
              px={6}
              py={4}
              position="relative"
              sx={{
                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  width: "10px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "gray.200",
                  borderRadius: "24px",
                },
              }}
            >
              {messages.length > 0 &&
                messages?.map((message) => (
                  <Box
                    key={message?._id}
                    alignSelf={
                      message?.sender?._id === currentUser?._id
                        ? "flex-start"
                        : "flex-end"
                    }
                    maxW="70%"
                  >
                    <Flex direction="column" gap={1}>
                      <Flex
                        align="center"
                        mb={1}
                        justifyContent={
                          message?.sender?._id === currentUser?._id
                            ? "flex-start"
                            : "flex-end"
                        }
                        gap={2}
                      >
                        {message?.sender?._id === currentUser?._id ? (
                          <>
                            <Avatar
                              size="xs"
                              name={message?.sender?.username}
                            />
                            <Text fontSize="xs" color="gray.500">
                              You • {formatTime(message?.createdAt)}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text fontSize="xs" color="gray.500">
                              {message?.sender?.username} •{" "}
                              {formatTime(message?.createdAt)}
                            </Text>
                            <Avatar
                              size="xs"
                              name={message?.sender?.username}
                            />
                          </>
                        )}
                      </Flex>
                      <Box
                        bg={
                          message?.sender?._id === currentUser?._id
                            ? "blue.500"
                            : "white"
                        }
                        color={
                          message?.sender?._id === currentUser?._id
                            ? "white"
                            : "gray.800"
                        }
                        p={3}
                        borderRadius="lg"
                        boxShadow="sm"
                      >
                        <Text>{message?.content}</Text>
                      </Box>
                    </Flex>
                  </Box>
                ))}
              {renderTypingIndicator()}
              <div ref={messagesEndRef} />
            </VStack>
            {/* {typingUsers.size > 0 && (
              <Box px={6} pb={2} bg="gray.50">
                <Text fontSize="sm" color="gray.600" fontStyle="italic">
                  {Array.from(typingUsers)
                    .filter((u) => u !== currentUser?.username)
                    .join(", ")}{" "}
                  {typingUsers.size === 1 ? "is" : "are"} typing...
                  <span style={{ animation: "pulse 1.4s infinite" }}>...</span>
                </Text>
              </Box>
            )} */}
            {/* Message Input */}
            <Box
              p={4}
              bg="white"
              borderTop="1px solid"
              borderColor="gray.200"
              position="relative"
              zIndex="1"
            >
              <InputGroup size="lg">
                <Input
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type your message..."
                  pr="4.5rem"
                  bg="gray.50"
                  border="none"
                  _focus={{
                    boxShadow: "none",
                    bg: "gray.100",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                />
                <InputRightElement width="4.5rem">
                  <Button
                    h="1.75rem"
                    size="sm"
                    colorScheme="blue"
                    borderRadius="full"
                    _hover={{
                      transform: "translateY(-1px)",
                    }}
                    transition="all 0.2s"
                    onClick={sendMessage}
                  >
                    <Icon as={FiSend} />
                  </Button>
                </InputRightElement>
              </InputGroup>
            </Box>
          </>
        ) : (
          <>
            <Flex
              h="100%"
              p={8}
              direction="column"
              align="center"
              justify="center"
              textAlign="center"
            >
              <Icon
                as={FiMessageCircle}
                fontSize="64px"
                color="gray.500"
                mb={4}
              />
              <Text fontSize="xl" fontWeight="medium" color="gray.800" mb={2}>
                Welcome to the Chat
              </Text>
              <Text fontSize="md" color="gray.500">
                Select a group from the sidebar to start chatting
              </Text>
            </Flex>
          </>
        )}
      </Box>

      {/* UsersList with fixed width */}
      <Box
        width="260px"
        position="sticky"
        right={0}
        top={0}
        height="100%"
        flexShrink={0}
      >
        {selectedGroup && <UsersList users={connectedUsers} />}
      </Box>
    </Flex>
  );
};

export default ChatArea;
