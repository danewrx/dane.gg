import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import SendIcon from '@mui/icons-material/Send';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Tooltip, Switch, FormControlLabel } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import MessageIcon from '@mui/icons-material/Message';
import GroupIcon from '@mui/icons-material/Group';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import { FaDiscord } from "react-icons/fa";
import axiosInstance from '../services/axios';

const themeRed = '#e48f8f';
const themeRedDark = '#ba7373';
const themeNeutralBorder = '#444';
const themeNeutralBorderFocus = '#666';
const themeCyan = '#7fd6ff';
const discordBrandBlue = '#7289DA';
const themeWhite = '#ffffff';
const themeLightGray = '#aaaaaa';
const themeInputBackground = '#232323';

export const ChatModeration = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const [clientCount, setClientCount] = useState(0);
    const [totalMessages, setTotalMessages] = useState(0);
    const [uniquePosters, setUniquePosters] = useState(0);
    const [isDiscordIntegrationEnabled, setIsDiscordIntegrationEnabled] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogUser, setDialogUser] = useState<{ userUUID: string, username: string } | null>(null);
    const [newUsername, setNewUsername] = useState('');

    const getToken = () => localStorage.getItem('adminToken');

    useEffect(() => {
        wsRef.current = new window.WebSocket(
            `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/chat`
        );
        wsRef.current.onopen = () => {
            console.log('WebSocket connected');
            sendWithAuth({ type: 'get_discord_integration_status' });
        };

        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);

            const ref = scrollContainerRef.current;
            if (ref) {
                wasAtBottomRef.current =
                    Math.abs(ref.scrollHeight - ref.scrollTop - ref.clientHeight) < 10;
            }

            if (data.type === 'history') {
                const normalizedHistory = data.data.map(msg => ({
                    ...msg,
                    client_uuid: msg.userUUID 
                })).reverse();
                setMessages(normalizedHistory);
            } else if (data.type === 'message') {
                const newMessage = {
                    ...data.data,
                    client_uuid: data.data.userUUID
                };
                if (wasAtBottomRef.current) {
                    setMessages(prev => [...prev, newMessage]);
                    setTimeout(() => scrollToBottom(), 0);
                } else {
                    setMessages(prev => [...prev, newMessage]);
                    setNewMessageWhileNotAtBottom(true);
                }
            } else if (data.type === 'message_deleted') {
                setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
            } else if (data.type === 'username_changed') {
                setMessages(prev => prev.map(msg =>
                    msg.client_uuid === data.userUUID
                        ? { ...msg, username: data.newUsername }
                        : msg
                ));
            } else if (data.type === 'client_count_update') {
                setClientCount(data.count);
            } else if (data.type === 'chat_aggregate_stats') {
                setTotalMessages(data.data.totalMessages);
                setUniquePosters(data.data.uniquePosters);
            } else if (data.type === 'discord_integration_status') {
                setIsDiscordIntegrationEnabled(data.enabled);
            }
        };
        wsRef.current.onerror = (err) => {
            console.error('WebSocket error:', err);
        };
        wsRef.current.onclose = () => {
            console.log('WebSocket closed');
            setClientCount(0);
        };
        return () => wsRef.current?.close();
    }, []);

    const sendWithAuth = (payload: any) => {
        wsRef.current?.send(JSON.stringify({
            ...payload,
            jwt: getToken(),
        }));
    };

    const deleteMessage = (id: number) => {
        sendWithAuth({ type: 'delete_message', messageId: id });
    };

    const changeUsername = (userUUID: string, newUsername: string) => {
        sendWithAuth({ type: 'change_username', userUUID, newUsername });
    };

    const sendAdminMessage = (content: string) => {
        sendWithAuth({ type: 'admin_message', content });
    };

    // Handler for the Discord integration toggle switch
    const handleToggleDiscordIntegration = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newStatus = event.target.checked;
        try {
            await axiosInstance.post('/api/discord/integration/status', { enabled: newStatus });
        } catch (error) {
            console.error("Failed to update Discord integration status:", error);
        }
    };

    const adminMsgRef = useRef<HTMLInputElement>(null);

    // Dialog handlers
    const openUsernameDialog = (userUUID: string, username: string) => {
        console.log('[openUsernameDialog] Called with userUUID:', userUUID, 'username:', username); // Log when function is called
        setDialogUser({ userUUID, username });
        setNewUsername(username);
        setDialogOpen(true);
    };

    const handleDialogSave = () => {
        if (dialogUser) {
            changeUsername(dialogUser.userUUID, newUsername.trim() || 'Anonymous');
            setDialogOpen(false);
        }
    };

    const handleDialogRemove = () => {
        if (dialogUser) {
            changeUsername(dialogUser.userUUID, 'Anonymous');
            setDialogOpen(false);
        }
    };

    // Helper for timestamp formatting
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday =
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate();
        return isToday
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : date.toLocaleString([], { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
    const [newMessageWhileNotAtBottom, setNewMessageWhileNotAtBottom] = useState(false);
    const wasAtBottomRef = useRef(true);
    const prevMessagesLength = useRef(0);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
        setNewMessageWhileNotAtBottom(false);
    };
    
    useLayoutEffect(() => {
        const ref = scrollContainerRef.current;
        if (!ref) return;
        if (messages.length > prevMessagesLength.current) {
            wasAtBottomRef.current =
                Math.abs(ref.scrollHeight - ref.scrollTop - ref.clientHeight) < 10;
        }
        prevMessagesLength.current = messages.length;
    }, [messages.length]);

    useLayoutEffect(() => {
        if (messages.length && !hasAutoScrolled) {
            scrollToBottom();
            setHasAutoScrolled(true);
        }
    }, [messages]);

    useEffect(() => {
        if (!hasAutoScrolled) return;
        if (wasAtBottomRef.current) {
            setTimeout(() => {
                scrollToBottom();
            }, 0);
            setNewMessageWhileNotAtBottom(false);
        } else {
            setNewMessageWhileNotAtBottom(true);
        }
    }, [messages, hasAutoScrolled]);

    const handleTableScroll = () => {
        const ref = scrollContainerRef.current;
        if (!ref) return;
        const isAtBottom =
            Math.abs(ref.scrollHeight - ref.scrollTop - ref.clientHeight) < 10;
        wasAtBottomRef.current = isAtBottom;
        if (isAtBottom) setNewMessageWhileNotAtBottom(false);
    };

    const StatCard = ({ title, value, icon }: { title: string, value: number | string, icon: React.ReactNode }) => (
        <Box
            sx={{
                background: themeInputBackground,
                color: themeWhite,
                padding: '15px',
                borderRadius: 2,
                border: `1px solid ${themeNeutralBorder}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                flex: 1,
                minWidth: '150px',
            }}
        >
            {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 30, color: themeRed } })} {/* Removed empty {} */}
            <Typography variant="h6" sx={{ color: themeWhite, fontWeight: 'bold', mt: 1 }}> {/* Removed empty {} */}
                {value}
            </Typography>
            <Typography variant="caption" sx={{ color: themeLightGray }}> {/* Removed empty {} */}
                {title}
            </Typography>
        </Box>
    );

    return (
        <div
            style={{
                padding: 16,
                width: '100%',
                maxWidth: 1200,
                margin: '32px auto',
                background: '#1a1a1a',
                borderRadius: 8,
                boxShadow: '0 2px 12px #0005',
                minHeight: 320,
                display: 'flex',
                flexDirection: 'column',
                height: '60vh',
                minWidth: 0,
                position: 'relative',
            }}
        >
            {/* Discord Integration Toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 2, paddingRight: 1 }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={isDiscordIntegrationEnabled}
                            onChange={handleToggleDiscordIntegration}
                            name="discordIntegration"
                            sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: themeCyan, 
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: themeCyan,
                                },
                            }}
                        />
                    }
                    labelPlacement="start"
                    label={
                        <Typography sx={{ color: themeWhite, fontFamily: 'monospace', mr: 1 }}>
                            Discord Bot
                        </Typography>
                    }
                    sx={{ color: themeWhite }}
                />
            </Box>

            {/* Stats Cards Row */}
            <Box sx={{ display: 'flex', gap: 2, marginBottom: 2, flexWrap: 'wrap' }}>
                <StatCard title="Connected Users" value={clientCount} icon={<PeopleIcon />} />
                <StatCard title="Total Messages" value={totalMessages} icon={<MessageIcon />} />
                <StatCard title="Unique Posters" value={uniquePosters} icon={<GroupIcon />} /> {/* Corrected title */}
            </Box>

            {/* New messages pill */}
            {newMessageWhileNotAtBottom && (
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: 72,
                        transform: 'translateX(-50%)',
                        zIndex: 20,
                        background: themeRed,
                        color: themeWhite,
                        borderRadius: 999,
                        boxShadow: '0 2px 8px #0007',
                        cursor: 'pointer',
                        minWidth: 0,
                        padding: '8px 20px 8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        fontSize: 16,
                        border: `2px solid ${themeWhite}`,
                        opacity: 0.97,
                        gap: 8,
                        userSelect: 'none',
                        pointerEvents: 'auto',
                    }}
                    onClick={scrollToBottom}
                    title="Scroll to latest"
                >
                    <ArrowDownwardIcon fontSize="small" style={{ marginRight: 4 }} />
                    New messages
                </div>
            )}

            <div
                ref={scrollContainerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    border: `1px solid ${themeNeutralBorder}`,
                    borderRadius: 6,
                    background: '#181818',
                    marginBottom: 16,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                }}
                onScroll={handleTableScroll}
            >
                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontFamily: 'monospace',
                        background: 'transparent',
                        color: themeWhite,
                        fontSize: 14,
                    }}
                >
                    <thead>
                        <tr style={{ background: themeInputBackground, position: 'sticky', top: 0, zIndex: 10 }}>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${themeNeutralBorder}`, textAlign: 'center' }}
                                sx={{
                                    width: { xs: '35px', sm: 'auto' },
                                    whiteSpace: 'nowrap'
                                }}
                            >Type</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${themeNeutralBorder}` }}
                                sx={{
                                    width: { xs: '55px', sm: 'auto' },
                                    whiteSpace: { xs: 'normal', sm: 'nowrap' }
                                }}
                            >Time</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${themeNeutralBorder}` }}
                                sx={{
                                    width: { xs: '70px', sm: 'auto' },
                                    maxWidth: { md: '150px' } 
                                }}
                            >User</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${themeNeutralBorder}` }}
                            >Message</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${themeNeutralBorder}` }}
                                sx={{
                                    width: { xs: '60px', sm: 'auto' },
                                    whiteSpace: 'nowrap'
                                }}
                            >Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {messages.map(msg => {
                            let usernameColor = themeRed;
                            if (msg.message_type === 'Discord') {
                                if (typeof msg.message_color === 'string' && msg.message_color.startsWith('#')) {
                                    usernameColor = msg.message_color;
                                } else {
                                    usernameColor = themeWhite;
                                }
                            }

                            let typeIcon = <ChatBubbleIcon fontSize="small" sx={{ color: themeWhite }} />;
                            let typeTooltip = "Chat Message";

                            if (msg.message_type === 'Discord') {
                                typeIcon = <FaDiscord style={{ fontSize: '20px', color: discordBrandBlue }} />;
                                typeTooltip = "Discord Message";
                            } else if (msg.message_type === 'admin') {
                                typeIcon = <AdminPanelSettings fontSize="small" sx={{ color: themeRed }} />;
                                typeTooltip = "Admin Message";
                            }

                            return (
                                <tr key={msg.id} style={{ borderBottom: `1px solid ${themeNeutralBorder}` }}> {/* Use neutral border */}
                                    <td style={{ padding: '4px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                        <Tooltip title={typeTooltip}>
                                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                                {typeIcon}
                                            </Box>
                                        </Tooltip>
                                    </td>
                                    <td style={{ padding: '4px 8px', color: themeLightGray, wordBreak: 'break-word' }}
                                        sx={{ 
                                            whiteSpace: { xs: 'normal', sm: 'nowrap' }
                                        }}
                                    >
                                        {msg.timestamp ? formatTimestamp(msg.timestamp) : ''}
                                    </td>
                                    <td style={{ padding: '4px 8px', color: usernameColor, wordBreak: 'break-all' }}>
                                        {msg.username}
                                    </td>
                                    <td style={{ padding: '4px 8px', wordBreak: 'break-word' }}>
                                        {msg.content}
                                    </td>
                                    <td style={{ padding: '4px 8px', whiteSpace: 'nowrap', display: 'flex', justifyContent: 'center' }}
                                        sx={{ 
                                            gap: { xs: 1, sm: 1, md: 2 } 
                                        }}
                                    >
                                        <Tooltip title={msg.message_type === 'Discord' ? 'You cannot change Discord usernames' : 'Change username'}>
                                            <span
                                                style={{
                                                    cursor: msg.message_type === 'Discord' ? 'not-allowed' : 'pointer',
                                                    color: msg.message_type === 'Discord' ? '#555' : themeCyan,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    opacity: msg.message_type === 'Discord' ? 0.5 : 1,
                                                }}
                                                onClick={() => {
                                                    if (msg.message_type === 'Discord') {
                                                        console.log('[Change Username Icon Click] This is a Discord message. Action prevented.');
                                                        return;
                                                    }

                                                    console.log('[Change Username Icon Click] Not a Discord message. Proceeding to check userIdentifier.');
                                                    const userIdentifier = msg.client_uuid;
                                                    console.log(`[Change Username Icon Click] userIdentifier (msg.client_uuid): "${userIdentifier}" (Type: ${typeof userIdentifier})`);

                                                    if (typeof userIdentifier === 'string' && userIdentifier.length > 0) {
                                                        console.log('[Change Username Icon Click] userIdentifier is valid. Calling openUsernameDialog.');
                                                        openUsernameDialog(userIdentifier, msg.username);
                                                    } else {
                                                        console.error(`[Change Username Icon Click] FAILED: userIdentifier is invalid or empty. Cannot open dialog.`);
                                                    }
                                                }}
                                            >
                                                <AssignmentIndIcon fontSize="small" />
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Delete message">
                                            <span
                                                style={{
                                                    cursor: 'pointer',
                                                    color: themeRed,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                }}
                                                onClick={() => deleteMessage(msg.id)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </span>
                                        </Tooltip>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <form
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginTop: 8,
                    flexWrap: 'wrap',
                    padding: 0,
                }}
                onSubmit={e => {
                    e.preventDefault();
                    const val = adminMsgRef.current?.value.trim();
                    if (val) {
                        sendAdminMessage(val);
                        if (adminMsgRef.current) adminMsgRef.current.value = '';
                    }
                }}
            >
                <input
                    ref={adminMsgRef}
                    type="text"
                    placeholder="Send admin message"
                    style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '10px 14px',
                        fontFamily: 'monospace',
                        background: themeInputBackground,
                        color: themeWhite,
                        border: `1.5px solid ${themeNeutralBorder}`,
                        borderRadius: 4,
                        fontSize: 16,
                        outline: 'none',
                        transition: 'border 0.2s',
                    }}
                    onFocus={e => (e.target.style.border = `1.5px solid ${themeNeutralBorderFocus}`)}
                    onBlur={e => (e.target.style.border = `1.5px solid ${themeNeutralBorder}`)}
                />
                <button // Send button can keep red accent or be changed
                    type="submit"
                    style={{
                        background: `linear-gradient(90deg, ${themeRed} 0%, ${themeRedDark} 100%)`,
                        color: themeWhite,
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        padding: '10px 24px',
                        fontWeight: 600,
                        fontSize: 16,
                        letterSpacing: 1,
                        boxShadow: '0 2px 8px #0002',
                        transition: 'background 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title="Send as Admin"
                >
                    <SendIcon fontSize="medium" />
                </button>
            </form>

            {/* Username Change Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                PaperProps={{
                    style: {
                        background: '#181818',
                        color: themeWhite,
                        borderRadius: 8,
                        minWidth: 320,
                        maxWidth: 400,
                        width: '100%',
                        border: `1.5px solid ${themeNeutralBorder}`
                    }
                }}
            >
                <DialogTitle sx={{ color: themeWhite, fontWeight: 700, fontFamily: 'monospace' }}> {/* Dialog title white */}
                    Change Username
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ color: themeLightGray, mb: 1 }}>
                            Set a new username for this user or remove it to revert to <b>Anonymous</b>.
                        </Typography>
                        <TextField
                            autoFocus
                            fullWidth
                            variant="outlined"
                            label="Username"
                            value={newUsername}
                            onChange={e => setNewUsername(e.target.value)}
                            sx={{
                                input: {
                                    color: themeWhite,
                                    background: themeInputBackground
                                },
                                label: { color: themeLightGray },
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: themeNeutralBorder },
                                    '&:hover fieldset': { borderColor: themeNeutralBorderFocus },
                                    '&.Mui-focused fieldset': { borderColor: themeNeutralBorderFocus }
                                }
                            }}
                            InputLabelProps={{
                                style: { color: themeLightGray }
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={handleDialogRemove}
                        sx={{
                            borderColor: themeRed,
                            color: themeRed,
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            '&:hover': {
                                background: 'rgba(228, 143, 143, 0.1)',
                                borderColor: themeRed,
                            }
                        }}
                    >
                        Remove
                    </Button>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            onClick={() => setDialogOpen(false)}
                            sx={{
                                color: themeWhite,
                                fontFamily: 'monospace'
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="contained"
                            onClick={handleDialogSave}
                            sx={{
                                background: `linear-gradient(90deg, ${themeRed} 0%, ${themeRedDark} 100%)`,
                                color: themeWhite,
                                fontWeight: 600,
                                fontFamily: 'monospace',
                                boxShadow: '0 2px 8px #0002',
                                '&:hover': {
                                    background: `linear-gradient(90deg, ${themeRedDark} 0%, ${themeRed} 100%)`
                                }
                            }}
                        >
                            Save
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>
        </div>
    );
};