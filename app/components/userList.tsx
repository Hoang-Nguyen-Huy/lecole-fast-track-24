import { useCallback, useEffect, useState } from "react";
import {
  getUserRevealPass,
  getUsers,
  updateSecretPhrase,
} from "~/apis/userApi";
import type { User } from "~/types/user";
import * as Yup from "yup";
import { useFormik } from "formik";
import UserTable from "./table/userTable";
import { useUser } from "~/contexts/userContext";
import socket from "~/utils/socket";
import UpdateSecretModal from "./modal/updateSecretModal";
import { toast } from "react-toastify";

const validationSchema = Yup.object({
  new_secret_phrase: Yup.string()
    .min(6, {
      message: "Secret phrase should be greater than 6 and smaller than 18",
    })
    .max(18, {
      message: "Secret phrase should be greater than 6 and smaller than 18",
    })
    .optional(),
});

export default function UserList() {
  const [users, setUsers] = useState<User[] | []>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useUser();
  const [isReveal, setIsReveal] = useState(false);

  const fetchUsers = useCallback(async (page: number) => {
    try {
      const response = await getUsers(page);
      const processedUsers = response.data.map((user, index) => ({
        ...user,
        ord: index + 1,
      }));
      setUsers(processedUsers);
      setCurrentPage(response.currentPage);
      setTotalPages(response.totalPage);
    } catch (error) {
      console.error("Failed to fetch users: ", error);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, user, fetchUsers]);

  useEffect(() => {
    socket.on("secret-phrase-updated", (updatedUser) => {
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.user_id === updatedUser.user_id ? { ...u, ...updatedUser } : u
        )
      );
    });

    return () => {
      socket.off("secret-phrase-updated");
    };
  }, []);

  const handleUpdateSecret = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleViewSecret = async (user: User) => {
    if (isReveal) {
      setIsReveal(false);
      setSelectedUser(null);
    } else {
      setIsReveal(true);
      const revealPass = await getUserRevealPass(user.user_id);
      setSelectedUser(revealPass);
    }
  };

  const formik = useFormik({
    initialValues: {
      new_secret_phrase: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        if (selectedUser) {
          socket.emit("update-secret-phrase", {
            id: selectedUser.user_id,
            newSecretPhrase: values.new_secret_phrase,
            editor: user,
          });
        }
        setIsModalOpen(false);
        resetForm();
      } catch (error) {
        console.error("Error submitting new secret phrase: ", error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    socket.on("success", (data) => {
      toast.success(data.message);
    });

    socket.on("error", (data) => {
      toast.error(data.error);
    });

    socket.on("user-updated-secret-phrase", (data) => {
      toast.info(data.broadcastMess);
    });

    return () => {
      socket.off("success");
      socket.off("error");
      socket.off("user-updated-secret-phrase");
    };
  }, []);

  return (
    <div className='min-h-screen bg-gray-100 p-8 pt-24'>
      <div className='max-w-7xl mx-auto'>
        <div className='flex justify-between items-center mb-6'>
          <h1 className='text-3xl font-bold text-gray-900'>Users</h1>
        </div>
        <UserTable
          users={users}
          onUpdate={handleUpdateSecret}
          onOpen={handleViewSecret}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          currentUser={user}
          selectedUser={selectedUser}
          isReveal={isReveal}
        />
        <UpdateSecretModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          formik={formik}
          selectedUser={selectedUser}
        />
      </div>
    </div>
  );
}
