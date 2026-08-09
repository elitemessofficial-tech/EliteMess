import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Star,
  ShieldCheck,
  Camera,
  X,
  Plus,
  CheckCircle2,
  Utensils,
  MessageSquare,
  ThumbsUp,
  Clock,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../context/ThemeContext';
import { getReviewsForMess, addMessReview, MessReview } from '../utils/messReviews';
import { getCurrentUserIdentity } from '../utils/userSession';

interface ReviewsModalProps {
  visible: boolean;
  messId: string;
  messName: string;
  onClose: () => void;
}

export default function ReviewsModal({
  visible,
  messId,
  messName,
  onClose,
}: ReviewsModalProps) {
  const { isDark } = useAppTheme();
  const [reviews, setReviews] = useState<MessReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New review form state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && messId) {
      loadReviews();
    }
  }, [visible, messId]);

  const loadReviews = async () => {
    setLoading(true);
    const data = await getReviewsForMess(messId);
    setReviews(data);
    setLoading(false);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setNewPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Image picker cancelled or error:', e);
    }
  };

  const handleSubmitReview = async () => {
    if (!newComment.trim()) {
      if (Platform.OS === 'web') alert('Please enter a review comment!');
      return;
    }

    setSubmitting(true);
    const user = await getCurrentUserIdentity();

    await addMessReview({
      messId,
      studentName: user.fullName || 'Verified Student',
      studentPhone: user.phone || '9876543210',
      rating: newRating,
      comment: newComment.trim(),
      photoUrl: newPhotoUri || undefined,
      mealType: 'Lunch',
      isVerifiedDiner: true,
    });

    setSubmitting(false);
    setNewComment('');
    setNewPhotoUri(null);
    setShowAddForm(false);
    loadReviews();
  };

  if (!visible) return null;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '4.8';

  const photosList = reviews.filter(r => r.photoUrl).map(r => r.photoUrl!);

  const colors = {
    cardBg: isDark ? '#0F1A17' : '#FFFFFF',
    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.borderColor }]}>
          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.messTitle, { color: colors.textMain }]} numberOfLines={1}>
                {messName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '900' }}>{avgRating}</Text>
                <Text style={{ color: colors.textSub, fontSize: 12 }}>({reviews.length} Verified Reviews)</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={colors.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Add Review Toggle Button */}
            {!showAddForm ? (
              <TouchableOpacity
                style={styles.addReviewBtn}
                onPress={() => setShowAddForm(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addReviewGrad}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.addReviewText}>Write Verified Review & Add Meal Photo</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              /* WRITE REVIEW FORM */
              <View style={[styles.writeFormBox, { backgroundColor: colors.inputBg }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.textMain, fontSize: 14, fontWeight: '900' }}>
                    Rate Your Meal Experience
                  </Text>
                  <TouchableOpacity onPress={() => setShowAddForm(false)}>
                    <X size={16} color={colors.textSub} />
                  </TouchableOpacity>
                </View>

                {/* Interactive Star Picker */}
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity key={star} onPress={() => setNewRating(star)}>
                      <Star
                        size={28}
                        color="#F59E0B"
                        fill={star <= newRating ? '#F59E0B' : 'transparent'}
                      />
                    </TouchableOpacity>
                  ))}
                  <Text style={{ color: '#F59E0B', fontWeight: '900', fontSize: 16, marginLeft: 8 }}>
                    {newRating}.0 / 5
                  </Text>
                </View>

                <TextInput
                  style={[styles.commentInput, { color: colors.textMain, borderColor: colors.borderColor }]}
                  placeholder="How was the food quality, taste, and hygiene?"
                  placeholderTextColor={colors.textSub}
                  multiline
                  numberOfLines={3}
                  value={newComment}
                  onChangeText={setNewComment}
                />

                {/* Photo Picker */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.photoPickBtn, { borderColor: colors.borderColor }]}
                    onPress={handlePickImage}
                    activeOpacity={0.8}
                  >
                    <Camera size={16} color="#10B981" />
                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>
                      {newPhotoUri ? 'Change Photo' : 'Attach Thali Photo'}
                    </Text>
                  </TouchableOpacity>

                  {newPhotoUri && (
                    <Image source={{ uri: newPhotoUri }} style={styles.previewThumb} />
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmitReview}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitBtnText}>
                    {submitting ? 'Posting Review...' : 'Publish Verified Review'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Photo Gallery Carousel */}
            {photosList.length > 0 && (
              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionTitle, { color: colors.textMain }]}>📷 Student Meal Photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {photosList.map((url, i) => (
                    <Image key={i} source={{ uri: url }} style={styles.galleryPhoto} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Verified Diner Reviews List */}
            <View style={styles.sectionWrap}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MessageSquare size={18} color="#10B981" />
                <Text style={[styles.sectionTitle, { color: colors.textMain, marginBottom: 0 }]}>Student Reviews</Text>
              </View>
              {loading ? (
                <ActivityIndicator color="#10B981" style={{ marginVertical: 20 }} />
              ) : reviews.length === 0 ? (
                <Text style={{ color: colors.textSub, fontSize: 13, textAlign: 'center', marginVertical: 20 }}>
                  No reviews yet. Be the first student to review this mess!
                </Text>
              ) : (
                reviews.map(rev => (
                  <View key={rev.id} style={[styles.reviewCard, { backgroundColor: colors.inputBg, borderColor: colors.borderColor }]}>
                    <View style={styles.revHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Text style={{ color: colors.textMain, fontWeight: '900', fontSize: 14 }}>
                          {rev.studentName}
                        </Text>
                        <View style={styles.verifiedBadge}>
                          <ShieldCheck size={11} color="#10B981" />
                          <Text style={styles.verifiedBadgeText}>Verified Diner</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Star size={13} color="#F59E0B" fill="#F59E0B" />
                        <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 12 }}>{rev.rating}.0</Text>
                      </View>
                    </View>

                    <Text style={{ color: colors.textSub, fontSize: 13, lineHeight: 18, marginVertical: 6 }}>
                      "{rev.comment}"
                    </Text>

                    {rev.photoUrl && (
                      <Image source={{ uri: rev.photoUrl }} style={styles.reviewAttachedPhoto} />
                    )}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text style={{ color: colors.textSub, fontSize: 11 }}>
                        {rev.mealType} • {new Date(rev.createdAt).toLocaleDateString()}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <ThumbsUp size={12} color="#10B981" />
                        <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>Helpful</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    maxHeight: '90%',
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.15)',
  },
  messTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 6,
  },
  addReviewBtn: {
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 18,
  },
  addReviewGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addReviewText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  writeFormBox: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  photoPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  submitBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionWrap: {
    marginBottom: 18,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  galleryPhoto: {
    width: 120,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  revHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
  },
  reviewAttachedPhoto: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginTop: 8,
  },
});
