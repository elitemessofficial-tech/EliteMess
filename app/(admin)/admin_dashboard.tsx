import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Switch,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShieldAlert,
  Users,
  Utensils,
  Wallet,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  TrendingUp,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Headphones,
  Send,
  Trash2,
  AlertCircle,
  Pencil,
  MapPin,
  Calendar,
  Zap,
  Phone,
  Crown,
  Store,
  User,
  MessageSquare,
  Check,
  X,
  Navigation,
  HelpCircle,
  Receipt,
  QrCode,
  ShieldCheck,
  Hash,
} from 'lucide-react-native';
import MessLocationPinModal from '../../src/components/MessLocationPinModal';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useDescope, useSession } from '@descope/react-native-sdk';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import AdminBottomBar, { AdminTabType } from '../../components/AdminBottomBar';
import {
  getAdminPlatformStats,
  getAllPayoutsAcrossMesses,
  adminApprovePayoutRecord,
  adminRejectPayoutRecord,
  createNewMessInNeon,
  toggleMessActiveStatusInNeon,
  deleteMessFromNeon,
  getAuthorizedOwners,
  addAuthorizedOwner,
  removeAuthorizedOwner,
  AdminPlatformStats,
  AuthorizedOwnerRecord,
} from '../../src/services/adminNeon';
import {
  getAllSupportQueries,
  adminReplyToSupportQuery,
  deleteSupportQuery,
  SupportQueryItem,
  ChatMessage,
} from '../../src/services/adminSupport';
import {
  getAllCommunityFAQs,
  answerAndPublishFAQ,
  deleteCommunityFAQ,
  CommunityFAQItem,
} from '../../src/services/adminFaq';
import { getMessesFromNeon, MessDBRecord, updateMessDetailsInNeon } from '../../src/services/neon';
import { OwnerPayoutRecord } from '../(owner)/owner_dashboard';
import envBypass from '../../src/config/env_bypass.json';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { isDark, toggleTheme } = useAppTheme();
  const sdk = useDescope();
  const { manageSession } = useSession();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<AdminTabType>('telemetry');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Stats & Real Database Records
  const [stats, setStats] = useState<AdminPlatformStats>({
    totalDinersToday: 0,
    totalVerifiedToday: 0,
    activeMessesCount: 0,
    totalPendingPayoutAmount: 0,
    totalSettledPayoutAmount: 0,
    totalLifetimePlatformMeals: 0,
  });

  const [allPayouts, setAllPayouts] = useState<(OwnerPayoutRecord & { messId: string; messName: string })[]>([]);
  const [payoutFilter, setPayoutFilter] = useState<'ALL' | 'PENDING' | 'SETTLED' | 'CANCELLED'>('ALL');
  const [selectedPayout, setSelectedPayout] = useState<(OwnerPayoutRecord & { messId: string; messName: string }) | null>(null);
  const [customUtrInput, setCustomUtrInput] = useState<string>('');
  const [processingPayoutAction, setProcessingPayoutAction] = useState<boolean>(false);

  // Messes Directory State
  const [messesList, setMessesList] = useState<MessDBRecord[]>([]);
  const [messSearchQuery, setMessSearchQuery] = useState<string>('');
  const [showAddMessModal, setShowAddMessModal] = useState<boolean>(false);
  const [editingMess, setEditingMess] = useState<MessDBRecord | null>(null);

  // Add/Edit Mess Form Inputs
  const [messFormName, setMessFormName] = useState<string>('');
  const [messFormAddress, setMessFormAddress] = useState<string>('');
  const [messFormOwnerName, setMessFormOwnerName] = useState<string>('');
  const [messFormOwnerPhone, setMessFormOwnerPhone] = useState<string>('');
  const [messFormLatitude, setMessFormLatitude] = useState<number>(18.5204);
  const [messFormLongitude, setMessFormLongitude] = useState<number>(73.8567);
  const [hasPinnedLocation, setHasPinnedLocation] = useState<boolean>(false);
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [messFormType, setMessFormType] = useState<string>('Pure Veg North Indian');
  const [messFormCutoff, setMessFormCutoff] = useState<string>('2:15 PM');
  const [messFormStarDish, setMessFormStarDish] = useState<string>('Special Paneer Thali');
  const [messFormRating, setMessFormRating] = useState<string>('4.7');
  const [savingMess, setSavingMess] = useState<boolean>(false);

  // Authorized Owners State
  const [ownersList, setOwnersList] = useState<AuthorizedOwnerRecord[]>([]);
  const [showAddOwnerModal, setShowAddOwnerModal] = useState<boolean>(false);
  const [ownerFormName, setOwnerFormName] = useState<string>('');
  const [ownerFormPhone, setOwnerFormPhone] = useState<string>('');
  const [ownerFormMessId, setOwnerFormMessId] = useState<string>('');
  const [ownerFormRole, setOwnerFormRole] = useState<'MESS_MANAGER' | 'CHEF_ADMIN' | 'ACCOUNTANT'>('MESS_MANAGER');
  const [savingOwner, setSavingOwner] = useState<boolean>(false);

  // Customer & Owner Support State
  const [supportQueries, setSupportQueries] = useState<SupportQueryItem[]>([]);
  const [supportFilter, setSupportFilter] = useState<'ALL' | 'CUSTOMER' | 'MESS_OWNER' | 'OPEN'>('ALL');
  const [selectedQuery, setSelectedQuery] = useState<SupportQueryItem | null>(null);
  const [replyInput, setReplyInput] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  // Community FAQs Moderation State
  const [communityFaqsList, setCommunityFaqsList] = useState<CommunityFAQItem[]>([]);
  const [supportTabMode, setSupportTabMode] = useState<'CHATS' | 'FAQS'>('CHATS');
  const [selectedFaqToAnswer, setSelectedFaqToAnswer] = useState<CommunityFAQItem | null>(null);
  const [faqAnswerInput, setFaqAnswerInput] = useState<string>('');
  const [processingFaqAction, setProcessingFaqAction] = useState<boolean>(false);

  // Logout Modal
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  // Delete Confirmation Modal
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    visible: boolean;
    type: 'mess' | 'owner';
    title: string;
    message: string;
    targetMess?: MessDBRecord;
    targetOwner?: AuthorizedOwnerRecord;
  }>({
    visible: false,
    type: 'mess',
    title: '',
    message: '',
  });

  // Feedback Notification Modal State
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showFeedback = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusModal({ visible: true, type, title, message });
  };

  const colors = {
    bg: isDark ? '#060A0C' : '#F8FAFC',
    cardBg: isDark ? 'rgba(14, 22, 19, 0.92)' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)',
    textMain: isDark ? '#FFFFFF' : '#000000',
    textSub: isDark ? '#94A3B8' : '#334155',
    inputBg: isDark ? 'rgba(16, 185, 129, 0.06)' : '#F1F5F9',
    emerald: '#10B981',
    gold: '#F59E0B',
    red: '#EF4444',
  };

  // Load all platform data
  const loadAdminData = useCallback(async () => {
    try {
      const [statsData, payoutsData, messesData, ownersData, queriesData, faqsData] = await Promise.all([
        getAdminPlatformStats().catch(() => ({
          totalDinersToday: 12,
          totalVerifiedToday: 8,
          activeMessesCount: 6,
          totalPendingPayoutAmount: 400,
          totalSettledPayoutAmount: 2500,
          totalLifetimePlatformMeals: 840,
        })),
        getAllPayoutsAcrossMesses().catch(() => []),
        getMessesFromNeon().catch(() => []),
        getAuthorizedOwners().catch(() => []),
        getAllSupportQueries().catch(() => []),
        getAllCommunityFAQs().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      if (Array.isArray(payoutsData)) setAllPayouts(payoutsData);
      if (Array.isArray(messesData)) setMessesList(messesData);
      if (Array.isArray(ownersData)) setOwnersList(ownersData);
      if (Array.isArray(queriesData)) setSupportQueries(queriesData);
      if (Array.isArray(faqsData)) setCommunityFaqsList(faqsData);

      if (messesData && messesData.length > 0 && !ownerFormMessId) {
        setOwnerFormMessId(messesData[0].id);
      }
    } catch (e) {
      console.warn('Error loading admin platform data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ownerFormMessId]);

  useEffect(() => {
    loadAdminData();

    // Listen for live customer support messages, FAQs, and Payout updates
    const subTicket = DeviceEventEmitter.addListener('ELITEMESS_SUPPORT_TICKET_UPDATED', () => {
      getAllSupportQueries().then(setSupportQueries);
    });
    const subMsg = DeviceEventEmitter.addListener('ELITEMESS_SUPPORT_MESSAGE_SENT', () => {
      getAllSupportQueries().then(setSupportQueries);
    });
    const subFaq = DeviceEventEmitter.addListener('ELITEMESS_FAQS_UPDATED', () => {
      getAllCommunityFAQs().then(setCommunityFaqsList);
    });
    const subPayout = DeviceEventEmitter.addListener('ELITEMESS_PAYOUTS_UPDATED', () => {
      getAllPayoutsAcrossMesses().then(setAllPayouts);
      getAdminPlatformStats().then(setStats);
    });

    // Auto-refresh interval for instant cross-tab / cross-browser dynamic updates
    const interval = setInterval(() => {
      getAllPayoutsAcrossMesses().then(setAllPayouts);
      getAllSupportQueries().then(setSupportQueries);
      getAllCommunityFAQs().then(setCommunityFaqsList);
    }, 2500);

    return () => {
      subTicket.remove();
      subMsg.remove();
      subFaq.remove();
      subPayout.remove();
      clearInterval(interval);
    };
  }, [loadAdminData]);

  // Auto-sync selectedQuery conversation when supportQueries refreshes
  useEffect(() => {
    if (selectedQuery) {
      const latest = supportQueries.find((q) => q.id === selectedQuery.id);
      if (latest && JSON.stringify(latest.messages) !== JSON.stringify(selectedQuery.messages)) {
        setSelectedQuery(latest);
      }
    }
  }, [supportQueries]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAdminData();
  };

  // ----------------------------------------------------
  // PAYOUT HANDLERS
  // ----------------------------------------------------
  const handleApprovePayout = async () => {
    if (!selectedPayout) return;
    setProcessingPayoutAction(true);
    try {
      const success = await adminApprovePayoutRecord(
        selectedPayout.messId,
        selectedPayout.id,
        customUtrInput.trim() || undefined
      );

      if (success) {
        setSelectedPayout(null);
        setCustomUtrInput('');
        showFeedback(
          'Payout Approved & Settled',
          `Disbursement of ${selectedPayout.amount} for "${selectedPayout.messName}" has been settled via IMPS.`
        );
        loadAdminData();
      } else {
        showFeedback('Action Failed', 'Could not approve payout record.', 'error');
      }
    } catch (e) {
      showFeedback('Error', 'An error occurred while approving payout.', 'error');
    } finally {
      setProcessingPayoutAction(false);
    }
  };

  const handleRejectPayout = async () => {
    if (!selectedPayout) return;
    setProcessingPayoutAction(true);
    try {
      const success = await adminRejectPayoutRecord(selectedPayout.messId, selectedPayout.id);
      if (success) {
        setSelectedPayout(null);
        showFeedback(
          'Payout Request Rejected',
          `Request for ${selectedPayout.amount} has been marked as CANCELLED and returned to balance.`,
          'info'
        );
        loadAdminData();
      } else {
        showFeedback('Action Failed', 'Could not cancel payout request.', 'error');
      }
    } catch (e) {
      showFeedback('Error', 'An error occurred while rejecting payout.', 'error');
    } finally {
      setProcessingPayoutAction(false);
    }
  };

  // ----------------------------------------------------
  // MESS HANDLERS
  // ----------------------------------------------------
  const handleSaveMessForm = async () => {
    if (!messFormName.trim()) {
      showFeedback('Missing Name', 'Please enter the Mess Name.', 'error');
      return;
    }

    if (!editingMess) {
      if (!messFormOwnerPhone.trim()) {
        showFeedback('Missing Owner Mobile', 'Please provide the Owner Mobile Number (Mandatory).', 'error');
        return;
      }
      if (!messFormOwnerName.trim()) {
        showFeedback('Missing Owner Name', 'Please provide the Manager / Owner Full Name (Mandatory).', 'error');
        return;
      }
    }

    if (!messFormAddress.trim()) {
      showFeedback('Missing Address', 'Please provide the Campus Location / Address.', 'error');
      return;
    }

    if (!hasPinnedLocation && (!messFormLatitude || !messFormLongitude)) {
      showFeedback('Map Pin Mandatory', 'Please tap "Pin Mess Location on Custom Map" to set the exact mess location for students.', 'error');
      return;
    }

    setSavingMess(true);
    try {
      if (editingMess) {
        // Update existing mess
        await updateMessDetailsInNeon(editingMess.id, {
          name: messFormName.trim(),
          address: messFormAddress.trim(),
          type: messFormType.trim(),
          cutoffTime: messFormCutoff.trim(),
          starDish: messFormStarDish.trim(),
          latitude: messFormLatitude,
          longitude: messFormLongitude,
        });
        showFeedback('Mess Updated', `"${messFormName.trim()}" details and map pin updated in database.`);
      } else {
        // Create new mess
        const cleanPhone = messFormOwnerPhone.replace(/\D/g, '');
        const newMess = await createNewMessInNeon({
          name: messFormName.trim(),
          address: messFormAddress.trim(),
          type: messFormType.trim(),
          cutoffTime: messFormCutoff.trim(),
          starDish: messFormStarDish.trim(),
          latitude: messFormLatitude,
          longitude: messFormLongitude,
          rating: Number(messFormRating) || 4.7,
        });

        if (newMess) {
          // Directly register and authorize owner phone number in owner section
          await addAuthorizedOwner({
            name: messFormOwnerName.trim(),
            phone: cleanPhone,
            messId: newMess.id,
            messName: newMess.name,
            role: 'MESS_MANAGER',
          });

          showFeedback(
            'Mess Added and Owner Authorized',
            `"${newMess.name}" is now live on the map and +91 ${cleanPhone} (${messFormOwnerName.trim()}) has been added to Authorized Managers.`
          );
        } else {
          showFeedback('Creation Failed', 'Failed to add mess to Neon Postgres database.', 'error');
        }
      }
      setShowAddMessModal(false);
      setEditingMess(null);
      resetMessForm();
      loadAdminData();
    } catch (e) {
      showFeedback('Error', 'An error occurred while saving mess.', 'error');
    } finally {
      setSavingMess(false);
    }
  };

  const handleToggleMessActive = async (mess: MessDBRecord) => {
    try {
      const nextStatus = !mess.is_active;
      await toggleMessActiveStatusInNeon(mess.id, nextStatus);
      setMessesList(prev => prev.map(m => m.id === mess.id ? { ...m, is_active: nextStatus } : m));
      showFeedback(
        nextStatus ? 'Mess Activated' : 'Mess Deactivated',
        `"${mess.name}" status updated to ${nextStatus ? 'Active' : 'Inactive'}.`
      );
    } catch (e) {}
  };

  // Request Confirmation before deleting mess
  const requestDeleteMess = (mess: MessDBRecord) => {
    setConfirmDeleteModal({
      visible: true,
      type: 'mess',
      title: 'Delete Mess from Network?',
      message: `Are you sure you want to permanently delete "${mess.name}"? This action cannot be undone.`,
      targetMess: mess,
    });
  };

  const executeDeleteMess = async () => {
    if (!confirmDeleteModal.targetMess) return;
    const target = confirmDeleteModal.targetMess;
    setConfirmDeleteModal(prev => ({ ...prev, visible: false }));

    try {
      await deleteMessFromNeon(target.id);
      setMessesList(prev => prev.filter(m => m.id !== target.id));
      showFeedback('Mess Deleted', `"${target.name}" has been removed from database.`);
    } catch (e) {
      showFeedback('Error', 'Could not delete mess from database.', 'error');
    }
  };

  const resetMessForm = () => {
    setMessFormName('');
    setMessFormAddress('');
    setMessFormOwnerName('');
    setMessFormOwnerPhone('');
    setMessFormLatitude(18.5204);
    setMessFormLongitude(73.8567);
    setHasPinnedLocation(false);
    setMessFormType('Pure Veg North Indian');
    setMessFormCutoff('2:15 PM');
    setMessFormStarDish('Special Paneer Thali');
    setMessFormRating('4.7');
  };

  // ----------------------------------------------------
  // OWNER AUTHORIZATION HANDLERS
  // ----------------------------------------------------
  const handleSaveOwnerForm = async () => {
    if (!ownerFormName.trim() || !ownerFormPhone.trim() || !ownerFormMessId) {
      showFeedback('Missing Information', 'Please provide Owner Name, Phone Number, and Assigned Mess.', 'error');
      return;
    }

    setSavingOwner(true);
    try {
      const targetMess = messesList.find(m => m.id === ownerFormMessId);
      const cleanPhone = ownerFormPhone.replace(/\D/g, '');

      await addAuthorizedOwner({
        name: ownerFormName.trim(),
        phone: cleanPhone,
        messId: ownerFormMessId,
        messName: targetMess ? targetMess.name : 'Partner Mess',
        role: ownerFormRole,
      });

      setShowAddOwnerModal(false);
      setOwnerFormName('');
      setOwnerFormPhone('');
      showFeedback(
        'Owner Authorized',
        `Phone +91 ${cleanPhone} is now registered to manage "${targetMess?.name || 'Mess'}".`
      );
      loadAdminData();
    } catch (e) {
      showFeedback('Error', 'Could not authorize new owner.', 'error');
    } finally {
      setSavingOwner(false);
    }
  };

  // Request Confirmation before revoking owner
  const requestRemoveOwner = (owner: AuthorizedOwnerRecord) => {
    setConfirmDeleteModal({
      visible: true,
      type: 'owner',
      title: 'Revoke Manager Access?',
      message: `Are you sure you want to revoke privileges for ${owner.name} (+91 ${owner.phone})?`,
      targetOwner: owner,
    });
  };

  const executeRemoveOwner = async () => {
    if (!confirmDeleteModal.targetOwner) return;
    const target = confirmDeleteModal.targetOwner;
    setConfirmDeleteModal(prev => ({ ...prev, visible: false }));

    try {
      await removeAuthorizedOwner(target.id);
      setOwnersList(prev => prev.filter(o => o.id !== target.id));
      showFeedback('Access Revoked', `Permissions for ${target.name} (+91 ${target.phone}) removed.`);
    } catch (e) {
      showFeedback('Error', 'Could not revoke owner access.', 'error');
    }
  };

  // ----------------------------------------------------
  // SUPPORT DESK HANDLERS
  // ----------------------------------------------------
  const handleSendSupportReply = async (resolve: boolean = false) => {
    // Only require text for "Send Reply", not for "Resolve and Close"
    if (!selectedQuery) return;
    if (!resolve && !replyInput.trim()) {
      showFeedback('Reply Required', 'Please enter a reply message for the user.', 'error');
      return;
    }

    setSendingReply(true);
    try {
      const nextStatus = resolve ? 'RESOLVED' : 'IN_PROGRESS';
      const replyText = replyInput.trim() || (resolve ? 'Ticket resolved by Super Admin.' : '');
      await adminReplyToSupportQuery(selectedQuery.id, replyText, nextStatus);
      showFeedback(
        resolve ? 'Ticket Resolved' : 'Reply Sent',
        `Response sent to ${selectedQuery.senderName}. Ticket marked as ${nextStatus}.`
      );

      if (resolve) {
        setSelectedQuery(null);
      } else {
        // Keep modal open and append message so admin can continue typing
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const adminMsg: ChatMessage = {
          id: `admin_${Date.now()}`,
          sender: 'admin',
          text: replyText,
          time: timeStr,
        };
        setSelectedQuery({
          ...selectedQuery,
          status: 'IN_PROGRESS',
          messages: [...(selectedQuery.messages || []), adminMsg],
        });
      }

      setReplyInput('');
      loadAdminData();
    } catch (e) {
      showFeedback('Error', 'Could not send support response.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSaveFaqAnswer = async () => {
    if (!selectedFaqToAnswer || !faqAnswerInput.trim()) {
      showFeedback('Answer Required', 'Please enter an official answer to publish.', 'error');
      return;
    }
    setProcessingFaqAction(true);
    try {
      const success = await answerAndPublishFAQ(selectedFaqToAnswer.id, faqAnswerInput.trim());
      if (success) {
        showFeedback('FAQ Published', 'Official answer published to public FAQs for all students.', 'success');
        setSelectedFaqToAnswer(null);
        setFaqAnswerInput('');
        const faqs = await getAllCommunityFAQs();
        setCommunityFaqsList(faqs);
      } else {
        showFeedback('Update Failed', 'Could not publish FAQ answer.', 'error');
      }
    } catch (e) {
      showFeedback('Error', 'An error occurred while publishing answer.', 'error');
    } finally {
      setProcessingFaqAction(false);
    }
  };

  const handleDeleteFaq = async (faqId: string) => {
    setProcessingFaqAction(true);
    try {
      const success = await deleteCommunityFAQ(faqId);
      if (success) {
        showFeedback('FAQ Deleted', 'Community question deleted.', 'info');
        const faqs = await getAllCommunityFAQs();
        setCommunityFaqsList(faqs);
      }
    } catch (e) {
      showFeedback('Error', 'Failed to delete FAQ.', 'error');
    } finally {
      setProcessingFaqAction(false);
    }
  };

  const doLogout = async () => {
    try {
      await AsyncStorage.setItem('explicit_logout', 'true');
      await AsyncStorage.removeItem('vip_session_active');
      await AsyncStorage.removeItem('user_selected_role');
      try { await sdk.logout(); } catch (e) {}
      try { await manageSession(undefined); } catch (e) {}
      router.replace('/(auth)/login');
    } catch (e) {
      router.replace('/(auth)/login');
    }
  };

  const pendingPayoutsList = allPayouts.filter(p => p.status === 'PENDING');
  const openSupportList = supportQueries.filter(q => q.status === 'OPEN');

  const filteredPayouts = allPayouts.filter(p => {
    if (payoutFilter === 'ALL') return true;
    return p.status === payoutFilter;
  });

  const filteredMesses = messesList.filter(m => {
    if (!messSearchQuery.trim()) return true;
    const q = messSearchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.address.toLowerCase().includes(q) || (m.type || '').toLowerCase().includes(q);
  });

  const filteredSupport = supportQueries.filter(q => {
    if (supportFilter === 'ALL') return true;
    if (supportFilter === 'OPEN') return q.status === 'OPEN';
    return q.senderType === supportFilter;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ================= SUPER ADMIN HEADER ================= */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <LinearGradient
              colors={['#10B981', '#047857']}
              style={styles.adminBadgeIcon}
            >
              <Crown size={20} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.adminHeaderTitle, { color: colors.textMain }]}>Super Admin Control</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.livePulseDot} />
                <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '900' }}>
                  VIP ACCESS • +91 {envBypass.EXPO_PUBLIC_VIP_NUMBER || '65244256'}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={toggleTheme} style={[styles.iconButton, { borderColor: colors.cardBorder }]} activeOpacity={0.8}>
              {isDark ? <Sun size={17} color="#F59E0B" /> : <Moon size={17} color="#10B981" />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowLogoutModal(true)} style={[styles.iconButton, { borderColor: 'rgba(239, 68, 68, 0.3)' }]} activeOpacity={0.8}>
              <LogOut size={17} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Portal Role Switcher */}
        <View style={styles.roleSwitcherRow}>
          <TouchableOpacity
            style={[styles.roleSwitchBtn, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}
            onPress={async () => {
              await AsyncStorage.setItem('user_selected_role', 'owner');
              router.replace('/(owner)/owner_dashboard');
            }}
          >
            <Store size={13} color="#F59E0B" />
            <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '800' }}>Owner Portal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleSwitchBtn, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}
            onPress={async () => {
              await AsyncStorage.setItem('user_selected_role', 'customer');
              router.replace('/');
            }}
          >
            <User size={13} color="#10B981" />
            <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>Customer Portal</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= MAIN CONTENT SCROLLVIEW ================= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* TAB 1: TELEMETRY & OVERVIEW */}
        {activeTab === 'telemetry' && (
          <AnimatedEntrance direction="up" delay={50}>
            {/* Platform KPI Cards */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Users size={18} color="#10B981" />
                </View>
                <Text style={[styles.kpiNumber, { color: colors.textMain }]}>{stats.totalDinersToday}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSub }]}>Total Diners Today</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <CheckCircle2 size={11} color="#10B981" />
                  <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '800' }}>
                    {stats.totalVerifiedToday} Verified
                  </Text>
                </View>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Building2 size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.kpiNumber, { color: colors.textMain }]}>{messesList.length}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSub }]}>Partner Messes</Text>
                <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '800', marginTop: 2 }}>
                  {messesList.filter(m => m.is_active).length} Active Network
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Wallet size={18} color="#EF4444" />
                </View>
                <Text style={[styles.kpiNumber, { color: colors.textMain }]}>₹{stats.totalPendingPayoutAmount}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSub }]}>Pending Payouts</Text>
                <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '800', marginTop: 2 }}>
                  {pendingPayoutsList.length} Request{pendingPayoutsList.length === 1 ? '' : 's'}
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <TrendingUp size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.kpiNumber, { color: colors.textMain }]}>{stats.totalLifetimePlatformMeals}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSub }]}>Lifetime Meals</Text>
                <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '800', marginTop: 2 }}>
                  Direct Neon Ledger
                </Text>
              </View>
            </View>

            {/* Quick Actions Panel */}
            <Text style={[styles.sectionHeading, { color: colors.textMain, marginTop: 18 }]}>Platform Control Hub</Text>
            <View style={styles.quickActionGrid}>
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                onPress={() => {
                  resetMessForm();
                  setEditingMess(null);
                  setShowAddMessModal(true);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#10B981', '#047857']} style={styles.actionGradIcon}>
                  <Plus size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionCardTitle, { color: colors.textMain }]}>Add New Mess</Text>
                  <Text style={[styles.actionCardSub, { color: colors.textSub }]}>Provision new partner mess</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                onPress={() => setShowAddOwnerModal(true)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.actionGradIcon}>
                  <Users size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionCardTitle, { color: colors.textMain }]}>Authorize Owner</Text>
                  <Text style={[styles.actionCardSub, { color: colors.textSub }]}>Register manager phone number</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                onPress={() => setActiveTab('payouts')}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.actionGradIcon}>
                  <Wallet size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionCardTitle, { color: colors.textMain }]}>Review Payouts ({pendingPayoutsList.length})</Text>
                  <Text style={[styles.actionCardSub, { color: colors.textSub }]}>IMPS Instant Disbursals</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                onPress={() => setActiveTab('support')}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.actionGradIcon}>
                  <Headphones size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionCardTitle, { color: colors.textMain }]}>Support Desk ({openSupportList.length})</Text>
                  <Text style={[styles.actionCardSub, { color: colors.textSub }]}>Customer and Owner queries</Text>
                </View>
              </TouchableOpacity>
            </View>
          </AnimatedEntrance>
        )}

        {/* TAB 2: PAYOUTS & SETTLEMENT HUB */}
        {activeTab === 'payouts' && (
          <AnimatedEntrance direction="up" delay={50}>
            {/* Payout Filter Tabs */}
            <View style={styles.filterPillRow}>
              {(['ALL', 'PENDING', 'SETTLED', 'CANCELLED'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setPayoutFilter(filter)}
                  style={[
                    styles.filterPill,
                    { borderColor: colors.cardBorder, backgroundColor: colors.inputBg },
                    payoutFilter === filter && { backgroundColor: '#10B981', borderColor: '#10B981' },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: colors.textSub },
                      payoutFilter === filter && { color: '#FFFFFF', fontWeight: '900' },
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payout Records List */}
            <Text style={[styles.sectionHeading, { color: colors.textMain, marginTop: 14 }]}>
              Mess Owner Settlements ({filteredPayouts.length})
            </Text>

            {filteredPayouts.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <Wallet size={36} color={colors.textSub} />
                <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No Settlement Records</Text>
                <Text style={{ fontSize: 12, color: colors.textSub, textAlign: 'center' }}>
                  No payouts matching filter "{payoutFilter}".
                </Text>
              </View>
            ) : (
              filteredPayouts.map((record) => (
                <TouchableOpacity
                  key={`${record.messId}_${record.id}`}
                  style={[styles.payoutCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                  onPress={() => {
                    setSelectedPayout(record);
                    setCustomUtrInput(`IMPS-${Date.now().toString().slice(-8)}`);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.payoutMessName, { color: colors.textMain }]} numberOfLines={1}>
                        {record.messName}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 2 }}>
                        {record.bankName} • •••• {record.accountMasked}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.payoutAmount, { color: colors.textMain }]}>{record.amount}</Text>
                      <View
                        style={[
                          styles.statusTag,
                          record.status === 'SETTLED'
                            ? { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }
                            : record.status === 'PENDING'
                            ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }
                            : { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' },
                        ]}
                      >
                        <Text
                          style={{
                            color: record.status === 'SETTLED' ? '#10B981' : record.status === 'PENDING' ? '#F59E0B' : '#EF4444',
                            fontSize: 10,
                            fontWeight: '900',
                          }}
                        >
                          {record.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.payoutFooterRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} color={colors.textSub} />
                      <Text style={{ fontSize: 11, color: colors.textSub }}>{record.date}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700' }}>
                      Review Settlement →
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </AnimatedEntrance>
        )}

        {/* TAB 3: MESSES & MENU MANAGEMENT */}
        {activeTab === 'messes' && (
          <AnimatedEntrance direction="up" delay={50}>
            {/* Search and Add Header */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, flex: 1 }]}>
                <Search size={16} color={colors.textSub} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textMain }]}
                  placeholder="Search mess name, cuisine, location..."
                  placeholderTextColor={colors.textSub}
                  value={messSearchQuery}
                  onChangeText={setMessSearchQuery}
                />
              </View>

              <TouchableOpacity
                style={styles.addHeroBtn}
                onPress={() => {
                  resetMessForm();
                  setEditingMess(null);
                  setShowAddMessModal(true);
                }}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Add Mess</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionHeading, { color: colors.textMain }]}>
              Network Messes Catalog ({filteredMesses.length})
            </Text>

            {filteredMesses.map((mess) => (
              <View key={mess.id} style={[styles.messCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={[styles.messCardTitle, { color: colors.textMain }]}>{mess.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <MapPin size={11} color={colors.textSub} />
                      <Text style={{ fontSize: 11, color: colors.textSub }} numberOfLines={1}>
                        {mess.address}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Utensils size={11} color="#10B981" />
                      <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700' }} numberOfLines={1}>
                        {mess.star_dish || 'Special Thali'}
                      </Text>
                      <Clock size={11} color={colors.textSub} />
                      <Text style={{ fontSize: 11, color: colors.textSub }}>
                        Cutoff: {mess.cutoff_time}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Switch
                      value={mess.is_active}
                      onValueChange={() => handleToggleMessActive(mess)}
                      trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#10B981' }}
                    />
                    <Text style={{ fontSize: 10, color: mess.is_active ? '#10B981' : colors.textSub, fontWeight: '800' }}>
                      {mess.is_active ? 'ACTIVE' : 'PAUSED'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.messCardFooter, { borderTopColor: colors.cardBorder }]}>
                  <TouchableOpacity
                    style={styles.messActionBtn}
                    onPress={() => {
                      setEditingMess(mess);
                      setMessFormName(mess.name);
                      setMessFormAddress(mess.address);
                      setMessFormType(mess.type || 'Pure Veg North Indian');
                      setMessFormCutoff(mess.cutoff_time || '2:15 PM');
                      setMessFormStarDish(mess.star_dish || 'Special Paneer Thali');
                      setMessFormRating(String(mess.rating || 4.7));
                      setShowAddMessModal(true);
                    }}
                  >
                    <Pencil size={12} color="#10B981" />
                    <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>Edit Mess</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.messActionBtn}
                    onPress={() => requestDeleteMess(mess)}
                  >
                    <Trash2 size={12} color="#EF4444" />
                    <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '800' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </AnimatedEntrance>
        )}

        {/* TAB 4: PARTNER OWNERS & ACCESS CONTROL */}
        {activeTab === 'owners' && (
          <AnimatedEntrance direction="up" delay={50}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Authorized Managers ({ownersList.length})</Text>
              <TouchableOpacity
                style={styles.addHeroBtn}
                onPress={() => setShowAddOwnerModal(true)}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Add Owner</Text>
              </TouchableOpacity>
            </View>

            {ownersList.map((owner) => (
              <View key={owner.id} style={[styles.ownerCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.ownerAvatarCircle}>
                    <Users size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ownerName, { color: colors.textMain }]}>{owner.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Phone size={11} color={colors.textSub} />
                      <Text style={{ fontSize: 11, color: colors.textSub }}>+91 {owner.phone}</Text>
                      <Building2 size={11} color={colors.textSub} />
                      <Text style={{ fontSize: 11, color: colors.textSub }} numberOfLines={1}>{owner.messName}</Text>
                    </View>
                    <View style={styles.roleBadge}>
                      <Text style={{ fontSize: 9, color: '#10B981', fontWeight: '900' }}>{owner.role}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => requestRemoveOwner(owner)} style={styles.deleteOwnerBtn}>
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </AnimatedEntrance>
        )}

        {/* TAB 5: CUSTOMER & OWNER SUPPORT DESK + COMMUNITY FAQS */}
        {activeTab === 'support' && (
          <AnimatedEntrance direction="up" delay={50}>
            {/* Top Sub-Switch: Live Chats vs Community FAQs */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setSupportTabMode('CHATS')}
                style={[
                  { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
                  supportTabMode === 'CHATS'
                    ? { backgroundColor: '#10B981', borderColor: '#10B981' }
                    : { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                ]}
              >
                <MessageSquare size={14} color={supportTabMode === 'CHATS' ? '#FFFFFF' : colors.textSub} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: supportTabMode === 'CHATS' ? '#FFFFFF' : colors.textMain }}>
                  Chat Tickets ({supportQueries.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSupportTabMode('FAQS')}
                style={[
                  { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
                  supportTabMode === 'FAQS'
                    ? { backgroundColor: '#10B981', borderColor: '#10B981' }
                    : { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                ]}
              >
                <HelpCircle size={14} color={supportTabMode === 'FAQS' ? '#FFFFFF' : colors.textSub} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: supportTabMode === 'FAQS' ? '#FFFFFF' : colors.textMain }}>
                  Campus FAQs ({communityFaqsList.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* MODE 1: LIVE CHAT TICKETS */}
            {supportTabMode === 'CHATS' && (
              <>
                {/* Filter Pills */}
                <View style={styles.filterPillRow}>
                  {(['ALL', 'OPEN', 'CUSTOMER', 'MESS_OWNER'] as const).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setSupportFilter(filter)}
                      style={[
                        styles.filterPill,
                        { borderColor: colors.cardBorder, backgroundColor: colors.inputBg },
                        supportFilter === filter && { backgroundColor: '#10B981', borderColor: '#10B981' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: colors.textSub },
                          supportFilter === filter && { color: '#FFFFFF', fontWeight: '900' },
                        ]}
                      >
                        {filter === 'MESS_OWNER' ? 'OWNERS' : filter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.sectionHeading, { color: colors.textMain, marginTop: 14 }]}>
                  Queries and Help Desk ({filteredSupport.length})
                </Text>

                {filteredSupport.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <MessageSquare size={36} color={colors.textSub} />
                    <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No Support Queries</Text>
                    <Text style={{ fontSize: 12, color: colors.textSub, textAlign: 'center' }}>
                      Real customer and mess owner inquiries will appear here live.
                    </Text>
                  </View>
                ) : (
                  filteredSupport.map((ticket) => (
                    <TouchableOpacity
                      key={ticket.id}
                      style={[styles.supportCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                      onPress={() => {
                        setSelectedQuery(ticket);
                        setReplyInput(ticket.adminReply || '');
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={[
                              styles.senderTypeBadge,
                              ticket.senderType === 'MESS_OWNER'
                                ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }
                                : { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: '900',
                                color: ticket.senderType === 'MESS_OWNER' ? '#F59E0B' : '#3B82F6',
                              }}
                            >
                              {ticket.senderType === 'MESS_OWNER' ? 'MESS OWNER' : 'CUSTOMER'}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: colors.textSub }}>{ticket.category.replace(/_/g, ' ')}</Text>
                        </View>

                        <View
                          style={[
                            styles.statusTag,
                            ticket.status === 'RESOLVED'
                              ? { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }
                              : ticket.status === 'IN_PROGRESS'
                              ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }
                              : { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' },
                          ]}
                        >
                          <Text
                            style={{
                              color: ticket.status === 'RESOLVED' ? '#10B981' : ticket.status === 'IN_PROGRESS' ? '#F59E0B' : '#EF4444',
                              fontSize: 9,
                              fontWeight: '900',
                            }}
                          >
                            {ticket.status}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.ticketSubject, { color: colors.textMain }]}>{ticket.subject}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSub, lineHeight: 17 }} numberOfLines={2}>
                        {ticket.message}
                      </Text>

                      <View style={styles.ticketFooter}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <User size={11} color={colors.textSub} />
                          <Text style={{ fontSize: 11, color: colors.textSub }}>
                            {ticket.senderName} ({ticket.senderPhone}) {ticket.messName ? `• ${ticket.messName}` : ''}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>Reply →</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}

            {/* MODE 2: CAMPUS FAQS MODERATION */}
            {supportTabMode === 'FAQS' && (
              <>
                <Text style={[styles.sectionHeading, { color: colors.textMain }]}>
                  Community Questions Moderation ({communityFaqsList.length})
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSub, marginBottom: 10 }}>
                  Answer student questions to publish them publicly on the campus FAQs page.
                </Text>

                {communityFaqsList.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <HelpCircle size={36} color={colors.textSub} />
                    <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No Community FAQs</Text>
                    <Text style={{ fontSize: 12, color: colors.textSub, textAlign: 'center' }}>
                      Questions asked by students in the app will appear here for Admin review and answering.
                    </Text>
                  </View>
                ) : (
                  communityFaqsList.map((faq) => {
                    const isPublished = faq.status === 'PUBLISHED';
                    return (
                      <View
                        key={faq.id}
                        style={[styles.supportCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View
                            style={[
                              styles.statusTag,
                              isPublished
                                ? { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }
                                : { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' },
                            ]}
                          >
                            <Text
                              style={{
                                color: isPublished ? '#10B981' : '#F59E0B',
                                fontSize: 9,
                                fontWeight: '900',
                              }}
                            >
                              {isPublished ? 'PUBLISHED PUBLIC' : 'PENDING ANSWER'}
                            </Text>
                          </View>

                          <Text style={{ fontSize: 10, color: colors.textSub }}>
                            {new Date(faq.createdAt).toLocaleDateString()}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMain, marginTop: 4 }}>
                          {faq.question}
                        </Text>

                        <Text style={{ fontSize: 11, color: colors.textSub }}>
                          Submitted by: {faq.askedByName}
                        </Text>

                        {faq.answer ? (
                          <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981', marginBottom: 2 }}>
                              OFFICIAL ANSWER:
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textMain, lineHeight: 17 }}>
                              {faq.answer}
                            </Text>
                          </View>
                        ) : null}

                        {/* Action Buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                            }}
                            onPress={() => handleDeleteFaq(faq.id)}
                            disabled={processingFaqAction}
                          >
                            <Trash2 size={13} color="#EF4444" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>Delete</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: '#10B981',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                            }}
                            onPress={() => {
                              setSelectedFaqToAnswer(faq);
                              setFaqAnswerInput(faq.answer || '');
                            }}
                          >
                            <CheckCircle2 size={13} color="#FFFFFF" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                              {isPublished ? 'Edit Answer' : 'Answer & Publish'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </AnimatedEntrance>
        )}
      </ScrollView>

      {/* ================= PAYOUT ACTION MODAL ================= */}
      <Modal
        visible={selectedPayout !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedPayout(null)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.sheetCard}>
            {selectedPayout && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
                <View style={styles.sheetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Wallet size={22} color="#10B981" />
                    <Text style={[styles.sheetTitle, { color: colors.textMain }]}>Review Mess Settlement</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedPayout(null)} style={styles.sheetCloseBtn}>
                    <X size={16} color={colors.textMain} />
                  </TouchableOpacity>
                </View>

                {/* Amount Hero */}
                <View style={[styles.amountHero, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                  <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>DISBURSEMENT AMOUNT</Text>
                  <Text style={[styles.amountHeroText, { color: colors.textMain }]}>{selectedPayout.amount}</Text>
                  <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '800', marginTop: 4 }}>
                    {selectedPayout.mealCount} Verified Diners Included
                  </Text>
                </View>

                {/* Info Fields */}
                <View style={[styles.infoGrid, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                  <View style={styles.infoRow}>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>Mess Partner:</Text>
                    <Text style={[styles.infoValue, { color: colors.textMain }]}>{selectedPayout.messName}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>Beneficiary Bank:</Text>
                    <Text style={[styles.infoValue, { color: colors.textMain }]}>{selectedPayout.bankName}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>Account Number:</Text>
                    <Text style={[styles.infoValue, { color: colors.textMain }]}>•••• {selectedPayout.accountMasked}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>IFSC Code:</Text>
                    <Text style={[styles.infoValue, { color: colors.textMain }]}>{selectedPayout.ifscCode}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>UPI VPA:</Text>
                    <Text style={[styles.infoValue, { color: colors.textMain }]}>{selectedPayout.upiId}</Text>
                  </View>
                </View>

                {/* UTR Input */}
                <View style={{ gap: 4 }}>
                  <Text style={[styles.formLabel, { color: colors.textSub }]}>Bank IMPS Reference / UTR Number</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                    value={customUtrInput}
                    onChangeText={setCustomUtrInput}
                    placeholder="e.g. IMPS-98402840"
                    placeholderTextColor={colors.textSub}
                  />
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}
                    onPress={handleRejectPayout}
                    disabled={processingPayoutAction}
                  >
                    <XCircle size={16} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '800' }}>Reject Request</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={handleApprovePayout}
                    disabled={processingPayoutAction}
                  >
                    <LinearGradient colors={['#10B981', '#047857']} style={styles.btnGrad}>
                      {processingPayoutAction ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <CheckCircle2 size={16} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Approve and Settle</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </BlurView>
        </View>
      </Modal>

      {/* ================= ADD / EDIT MESS MODAL ================= */}
      <Modal
        visible={showAddMessModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddMessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="#10B981" />
                <Text style={[styles.sheetTitle, { color: colors.textMain }]}>
                  {editingMess ? 'Edit Mess Info' : 'Provision New Partner Mess'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddMessModal(false)} style={styles.sheetCloseBtn}>
                <X size={16} color={colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
              <View style={{ gap: 4 }}>
                <Text style={[styles.formLabel, { color: colors.textSub }]}>Mess Name *</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                  value={messFormName}
                  onChangeText={setMessFormName}
                  placeholder="e.g. Royal Punjabi Rasoi"
                  placeholderTextColor={colors.textSub}
                />
              </View>

              {!editingMess && (
                <>
                  <View style={{ gap: 4 }}>
                    <Text style={[styles.formLabel, { color: colors.textSub }]}>Owner Mobile Number (Mandatory) *</Text>
                    <TextInput
                      style={[styles.formInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                      value={messFormOwnerPhone}
                      onChangeText={setMessFormOwnerPhone}
                      placeholder="e.g. 9876543210 (Will appear in Owners section)"
                      placeholderTextColor={colors.textSub}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={{ gap: 4 }}>
                    <Text style={[styles.formLabel, { color: colors.textSub }]}>Owner / Manager Full Name (Mandatory) *</Text>
                    <TextInput
                      style={[styles.formInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                      value={messFormOwnerName}
                      onChangeText={setMessFormOwnerName}
                      placeholder="e.g. Rajesh Sharma"
                      placeholderTextColor={colors.textSub}
                    />
                  </View>
                </>
              )}

              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.formLabel, { color: colors.textSub }]}>Campus Location / Address *</Text>
                  {hasPinnedLocation && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} color="#10B981" />
                      <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '800' }}>PINNED ON MAP</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={[styles.formInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                  value={messFormAddress}
                  onChangeText={setMessFormAddress}
                  placeholder="e.g. Gate 3, Central Campus Hub, Pune"
                  placeholderTextColor={colors.textSub}
                />

                {/* Direct Map Pin Action */}
                <TouchableOpacity
                  style={[
                    styles.pinLocationBtn,
                    {
                      borderColor: hasPinnedLocation ? '#10B981' : colors.cardBorder,
                      backgroundColor: hasPinnedLocation ? 'rgba(16, 185, 129, 0.12)' : colors.inputBg,
                    },
                  ]}
                  onPress={() => setShowLocationPicker(true)}
                  activeOpacity={0.8}
                >
                  <MapPin size={16} color={hasPinnedLocation ? '#10B981' : '#F59E0B'} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: hasPinnedLocation ? '#10B981' : colors.textMain,
                    }}
                  >
                    {hasPinnedLocation
                      ? `Pinned: (${messFormLatitude.toFixed(4)}, ${messFormLongitude.toFixed(4)}) • Tap to Re-Pin`
                      : 'Pin Mess on Custom Map (Mandatory Field) *'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={[styles.formLabel, { color: colors.textSub }]}>Cuisine / Food Specialty</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                  value={messFormType}
                  onChangeText={setMessFormType}
                  placeholder="e.g. Punjabi Deluxe Thali & Parathas"
                  placeholderTextColor={colors.textSub}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={[styles.formLabel, { color: colors.textSub }]}>Pre-Book Cutoff Time</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                  value={messFormCutoff}
                  onChangeText={setMessFormCutoff}
                  placeholder="e.g. 2:15 PM or 7:00 PM"
                  placeholderTextColor={colors.textSub}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={[styles.formLabel, { color: colors.textSub }]}>Star Dish</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                  value={messFormStarDish}
                  onChangeText={setMessFormStarDish}
                  placeholder="e.g. Special Paneer Butter Masala"
                  placeholderTextColor={colors.textSub}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}
                  onPress={() => setShowAddMessModal(false)}
                >
                  <Text style={{ color: colors.textMain, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveMessForm}
                  disabled={savingMess}
                >
                  <LinearGradient colors={['#10B981', '#047857']} style={styles.btnGrad}>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                      {savingMess ? 'Saving...' : editingMess ? 'Update Mess' : 'Add to Network'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* ================= AUTHORIZE OWNER MODAL ================= */}
      <Modal
        visible={showAddOwnerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddOwnerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Users size={20} color="#10B981" />
                <Text style={[styles.sheetTitle, { color: colors.textMain }]}>Authorize Partner Owner</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddOwnerModal(false)} style={styles.sheetCloseBtn}>
                <X size={16} color={colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
              <View style={{ gap: 4 }}>
                <Text style={[styles.formLabel, { color: colors.textSub }]}>Owner / Manager Name</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                  value={ownerFormName}
                  onChangeText={setOwnerFormName}
                  placeholder="e.g. Ramesh Kulkarni"
                  placeholderTextColor={colors.textSub}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={[styles.formLabel, { color: colors.textSub }]}>Manager Mobile Number</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                  value={ownerFormPhone}
                  onChangeText={setOwnerFormPhone}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor={colors.textSub}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={[styles.formLabel, { color: colors.textSub }]}>Assigned Mess Branch</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                  {messesList.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setOwnerFormMessId(m.id)}
                      style={[
                        styles.messSelectPill,
                        { borderColor: colors.cardBorder, backgroundColor: colors.inputBg },
                        ownerFormMessId === m.id && { backgroundColor: '#10B981', borderColor: '#10B981' },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: ownerFormMessId === m.id ? '#FFFFFF' : colors.textMain,
                        }}
                      >
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}
                  onPress={() => setShowAddOwnerModal(false)}
                >
                  <Text style={{ color: colors.textMain, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveOwnerForm}
                  disabled={savingOwner}
                >
                  <LinearGradient colors={['#10B981', '#047857']} style={styles.btnGrad}>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                      {savingOwner ? 'Saving...' : 'Authorize Manager'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* ================= SUPPORT TICKET MODAL ================= */}
      <Modal
        visible={selectedQuery !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedQuery(null)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.sheetCard}>
            {selectedQuery && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
                <View style={styles.sheetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Headphones size={20} color="#10B981" />
                    <Text style={[styles.sheetTitle, { color: colors.textMain }]}>Support Query Response</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedQuery(null)} style={styles.sheetCloseBtn}>
                    <X size={16} color={colors.textMain} />
                  </TouchableOpacity>
                </View>

                {/* Ticket Details */}
                <View style={[styles.infoGrid, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                  <View style={styles.infoRow}>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>Sender:</Text>
                    <Text style={[styles.infoValue, { color: colors.textMain }]}>
                      {selectedQuery.senderName} ({selectedQuery.senderType})
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>Phone:</Text>
                    <Text style={[styles.infoValue, { color: colors.textMain }]}>+91 {selectedQuery.senderPhone}</Text>
                  </View>
                  {selectedQuery.messName && (
                    <View style={styles.infoRow}>
                      <Text style={{ fontSize: 11, color: colors.textSub }}>Mess Branch:</Text>
                      <Text style={[styles.infoValue, { color: colors.textMain }]}>{selectedQuery.messName}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>Subject:</Text>
                    <Text style={[styles.infoValue, { color: colors.textMain }]}>{selectedQuery.subject}</Text>
                  </View>
                </View>

                {/* Live Conversation Thread */}
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>
                    CONVERSATION THREAD ({selectedQuery.messages?.length || 1})
                  </Text>
                  {(selectedQuery.messages && selectedQuery.messages.length > 0
                    ? selectedQuery.messages
                    : [{ id: '1', sender: 'customer' as const, text: selectedQuery.message, time: '' }]
                  ).map((msg, idx) => {
                    if (msg.isDivider || msg.text?.startsWith('New Support Session Started')) {
                      return (
                        <View key={msg.id || idx} style={{ width: '100%', alignItems: 'center', marginVertical: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                            <Clock size={11} color="#10B981" />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>
                              {msg.dividerText || msg.text}
                            </Text>
                          </View>
                        </View>
                      );
                    }

                    const isAdmin = msg.sender === 'admin' || msg.sender === 'concierge';
                    return (
                      <View
                        key={msg.id || idx}
                        style={{
                          alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                          maxWidth: '88%',
                          backgroundColor: isAdmin ? 'rgba(16, 185, 129, 0.18)' : colors.inputBg,
                          borderColor: isAdmin ? '#10B981' : colors.cardBorder,
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          gap: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: isAdmin ? '#10B981' : colors.textSub,
                          }}
                        >
                          {isAdmin ? 'Super Admin' : selectedQuery.senderName} {msg.time ? `• ${msg.time}` : ''}
                        </Text>
                        {msg.imageUri && (
                          <Image
                            source={{ uri: msg.imageUri }}
                            style={{ width: 200, height: 140, borderRadius: 10, marginVertical: 4 }}
                            resizeMode="cover"
                          />
                        )}

                        {/* Digital Booking Receipt Card */}
                        {msg.receiptData && (
                          <View
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              borderColor: '#10B981',
                              borderWidth: 1,
                              borderRadius: 12,
                              padding: 12,
                              marginVertical: 4,
                              gap: 8,
                              minWidth: 210,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Receipt size={14} color="#10B981" />
                                <Text style={{ fontSize: 10, fontWeight: '900', color: '#10B981' }}>
                                  VERIFIED DINING RECEIPT
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: msg.receiptData.status?.toLowerCase() === 'booked' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                  borderColor: msg.receiptData.status?.toLowerCase() === 'booked' ? '#10B981' : '#3B82F6',
                                  borderWidth: 1,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 9, fontWeight: '900', color: msg.receiptData.status?.toLowerCase() === 'booked' ? '#10B981' : '#3B82F6' }}>
                                  {msg.receiptData.status?.toUpperCase()}
                                </Text>
                              </View>
                            </View>

                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain }}>
                              {msg.receiptData.messName}
                            </Text>

                            <View style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: 8, gap: 6, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Hash size={10} color={colors.textSub} />
                                  <Text style={{ fontSize: 10, color: colors.textSub }}>Order ID</Text>
                                </View>
                                <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '800' }}>
                                  {msg.receiptData.orderId || `#FM-${msg.receiptData.bookingId?.slice(-6).toUpperCase()}`}
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Utensils size={10} color={colors.textSub} />
                                  <Text style={{ fontSize: 10, color: colors.textSub }}>Meal Slot</Text>
                                </View>
                                <Text style={{ fontSize: 10, color: colors.textMain, fontWeight: '700' }}>
                                  {msg.receiptData.mealType?.toUpperCase()}
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Calendar size={10} color={colors.textSub} />
                                  <Text style={{ fontSize: 10, color: colors.textSub }}>Date</Text>
                                </View>
                                <Text style={{ fontSize: 10, color: colors.textMain, fontWeight: '700' }}>
                                  {msg.receiptData.date}
                                </Text>
                              </View>
                              {msg.receiptData.exactTime ? (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Clock size={10} color={colors.textSub} />
                                    <Text style={{ fontSize: 10, color: colors.textSub }}>Timing</Text>
                                  </View>
                                  <Text style={{ fontSize: 10, color: colors.textMain, fontWeight: '700' }}>
                                    {msg.receiptData.exactTime}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            <View
                              style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                paddingVertical: 4,
                                paddingHorizontal: 8,
                                borderRadius: 6,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                              }}
                            >
                              <ShieldCheck size={11} color="#10B981" />
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>
                                1 Verified Meal Token Deducted
                              </Text>
                            </View>
                          </View>
                        )}

                        {msg.text && !msg.receiptData ? (
                          <Text style={{ fontSize: 13, color: colors.textMain, lineHeight: 18 }}>
                            {msg.text}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                {/* Admin Reply Input — hidden if ticket already resolved */}
                {selectedQuery?.status === 'RESOLVED' ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16, gap: 6 }}>
                    <CheckCircle2 size={28} color="#10B981" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#10B981' }}>Ticket Resolved</Text>
                    <Text style={{ fontSize: 11, color: colors.textSub, textAlign: 'center' }}>
                      This support session has been resolved and closed.
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={{ gap: 4 }}>
                      <Text style={[styles.formLabel, { color: colors.textSub }]}>Admin Resolution / Reply</Text>
                      <TextInput
                        style={[styles.replyTextArea, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                        value={replyInput}
                        onChangeText={setReplyInput}
                        placeholder="Type official reply / resolution details..."
                        placeholderTextColor={colors.textSub}
                        multiline
                      />
                    </View>

                    {/* Reply Actions */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                      <TouchableOpacity
                        style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}
                        onPress={() => handleSendSupportReply(false)}
                        disabled={sendingReply}
                      >
                        <Send size={14} color={colors.textMain} />
                        <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 12 }}>Send Reply</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={() => handleSendSupportReply(true)}
                        disabled={sendingReply}
                      >
                        <LinearGradient colors={['#10B981', '#047857']} style={styles.btnGrad}>
                          <CheckCircle2 size={16} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Resolve and Close</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            )}
          </BlurView>
        </View>
      </Modal>

      {/* ================= ANSWER & PUBLISH FAQ MODAL ================= */}
      <Modal
        visible={selectedFaqToAnswer !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedFaqToAnswer(null)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.sheetCard}>
            {selectedFaqToAnswer && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
                <View style={styles.sheetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <HelpCircle size={20} color="#10B981" />
                    <Text style={[styles.sheetTitle, { color: colors.textMain }]}>Answer Campus FAQ</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedFaqToAnswer(null)} style={styles.sheetCloseBtn}>
                    <X size={16} color={colors.textMain} />
                  </TouchableOpacity>
                </View>

                {/* Question Details */}
                <View style={[styles.infoGrid, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                  <View style={styles.infoRow}>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>Asked By:</Text>
                    <Text style={[styles.infoValue, { color: colors.textMain }]}>{selectedFaqToAnswer.askedByName}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>Date:</Text>
                    <Text style={[styles.infoValue, { color: colors.textMain }]}>
                      {new Date(selectedFaqToAnswer.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Student's Question */}
                <View style={[styles.userMessageCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                  <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>STUDENT QUESTION</Text>
                  <Text style={{ fontSize: 14, color: colors.textMain, lineHeight: 19, marginTop: 4, fontWeight: '700' }}>
                    {selectedFaqToAnswer.question}
                  </Text>
                </View>

                {/* Official Answer Input */}
                <View style={{ gap: 4 }}>
                  <Text style={[styles.formLabel, { color: colors.textSub }]}>Official Answer (Visible to All Students)</Text>
                  <TextInput
                    style={[
                      styles.replyTextArea,
                      { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder, minHeight: 90 },
                    ]}
                    value={faqAnswerInput}
                    onChangeText={setFaqAnswerInput}
                    placeholder="Type official verified answer to publish in student FAQs..."
                    placeholderTextColor={colors.textSub}
                    multiline
                  />
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}
                    onPress={() => setSelectedFaqToAnswer(null)}
                    disabled={processingFaqAction}
                  >
                    <Text style={{ color: colors.textMain, fontWeight: '700' }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveFaqAnswer}
                    disabled={processingFaqAction || !faqAnswerInput.trim()}
                  >
                    <LinearGradient colors={['#10B981', '#047857']} style={styles.btnGrad}>
                      {processingFaqAction ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <CheckCircle2 size={16} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                            Publish to Public FAQs
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </BlurView>
        </View>
      </Modal>

      {/* ================= DELETE / REVOKE CONFIRMATION MODAL ================= */}
      <Modal
        visible={confirmDeleteModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmDeleteModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.centerModalOverlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.confirmModalCard}>
            <View style={styles.deleteIconCircle}>
              <Trash2 size={26} color="#EF4444" />
            </View>
            <Text style={[styles.logoutTitle, { color: colors.textMain }]}>{confirmDeleteModal.title}</Text>
            <Text style={[styles.logoutSub, { color: colors.textSub }]}>
              {confirmDeleteModal.message}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}
                onPress={() => setConfirmDeleteModal(prev => ({ ...prev, visible: false }))}
              >
                <Text style={{ color: colors.textMain, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={() => {
                  if (confirmDeleteModal.type === 'mess') executeDeleteMess();
                  else executeRemoveOwner();
                }}
              >
                <Trash2 size={15} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  {confirmDeleteModal.type === 'mess' ? 'Delete Mess' : 'Revoke Access'}
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.centerModalOverlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.logoutModalCard}>
            <View style={styles.logoutIconCircle}>
              <LogOut size={26} color="#EF4444" />
            </View>
            <Text style={[styles.logoutTitle, { color: colors.textMain }]}>Exit Super Admin Portal?</Text>
            <Text style={[styles.logoutSub, { color: colors.textSub }]}>
              You will be logged out of VIP privileged admin controls.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={{ color: colors.textMain, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutConfirmBtn} onPress={doLogout}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* ================= STATUS / FEEDBACK MODAL (CENTERED & CLEAN) ================= */}
      <Modal
        visible={statusModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStatusModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.centerModalOverlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.statusModalCard}>
            <View
              style={[
                styles.statusIconCircle,
                statusModal.type === 'error'
                  ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.35)' }
                  : { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.35)' },
              ]}
            >
              {statusModal.type === 'error' ? (
                <AlertCircle size={28} color="#EF4444" />
              ) : (
                <CheckCircle2 size={28} color="#10B981" />
              )}
            </View>
            <Text style={[styles.logoutTitle, { color: colors.textMain }]}>{statusModal.title}</Text>
            <Text style={[styles.logoutSub, { color: colors.textSub, marginBottom: 18 }]}>{statusModal.message}</Text>
            <TouchableOpacity
              style={styles.statusOkBtn}
              onPress={() => setStatusModal(prev => ({ ...prev, visible: false }))}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#10B981', '#047857']} style={styles.btnGrad}>
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Dismiss</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>

      {/* ================= MAP LOCATION PICKER MODAL ================= */}
      <MessLocationPinModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        initialAddress={messFormAddress}
        initialLatitude={messFormLatitude}
        initialLongitude={messFormLongitude}
        onLocationSaved={(loc) => {
          setMessFormAddress(loc.address);
          setMessFormLatitude(loc.latitude);
          setMessFormLongitude(loc.longitude);
          setHasPinnedLocation(true);
          setShowLocationPicker(false);
        }}
      />

      {/* ================= DEDICATED ADMIN BOTTOM BAR ================= */}
      <AdminBottomBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingPayoutsCount={pendingPayoutsList.length}
        openSupportCount={openSupportList.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pinLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  adminBadgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  roleSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 2,
  },
  kpiIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickActionGrid: {
    gap: 8,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  actionGradIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  actionCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  payoutCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 8,
  },
  payoutMessName: {
    fontSize: 13,
    fontWeight: '800',
  },
  payoutAmount: {
    fontSize: 15,
    fontWeight: '900',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 3,
  },
  payoutFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 0.8,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  addHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
  },
  messCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 8,
  },
  messCardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  messCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 0.8,
  },
  messActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  ownerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  ownerAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerName: {
    fontSize: 13,
    fontWeight: '800',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginTop: 4,
  },
  deleteOwnerBtn: {
    padding: 8,
  },
  supportCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 6,
  },
  senderTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  ticketSubject: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 0.8,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountHero: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  amountHeroText: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  infoGrid: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  formInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  replyTextArea: {
    height: 80,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
  userMessageCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  rejectBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  approveBtn: {
    flex: 1.3,
    height: 46,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  saveBtn: {
    flex: 1.3,
    height: 46,
    borderRadius: 12,
    overflow: 'hidden',
  },
  btnGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  messSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  logoutModalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
  },
  logoutIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
  },
  deleteIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteConfirmBtn: {
    flex: 1.2,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  logoutTitle: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  logoutSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  logoutConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusModalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
  },
  statusIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusOkBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
  },
});
