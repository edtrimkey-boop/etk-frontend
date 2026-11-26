'use client';

import React from 'react';
import CustomAlertModal from './CustomAlertModal';
import ConfirmModal from './ConfirmModal';
import PasswordModal from './PasswordModal';
import UserProfileModal from './UserProfileModal';
import PaperSubmitModal from './PaperSubmitModal';
import DocSubmitModal from './DocSubmitModal';
import TeacherRegModal from './TeacherRegModal';
import TeacherEditModal from './TeacherEditModal';
import OperatorEditModal from './OperatorEditModal';
import AssignModal from './AssignModal';
import JobChatModal from './JobChatModal';
import UploadProgressModal from './UploadProgressModal';
import ProfilePhotoModal from './ProfilePhotoModal';
import BillingReceiptModal from './BillingReceiptModal';
import FlowPaymentModal from './FlowPaymentModal';
import SyncLoader from '@/components/shared/SyncLoader';

export default function ModalHost() {
  return (
    <>
      <SyncLoader />
      <UploadProgressModal />
      <ProfilePhotoModal />
      <CustomAlertModal />
      <ConfirmModal />
      <PasswordModal />
      <UserProfileModal />
      <PaperSubmitModal />
      <DocSubmitModal />
      <TeacherRegModal />
      <TeacherEditModal />
      <OperatorEditModal />
      <AssignModal />
      <JobChatModal />
      <BillingReceiptModal />
      <FlowPaymentModal />
    </>
  );
}
