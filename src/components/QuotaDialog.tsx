import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/useAccount";
import { formatDate } from "@/lib/api";

/** Shown when today's analyses are used up: how to get more. */
const QuotaDialog = ({ open, onOpenChange, message }: { open: boolean; onOpenChange: (open: boolean) => void; message: string }) => {
  const { account, usage } = useAccount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bạn đã dùng hết lượt kiểm tra hôm nay</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        {usage && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Lượt mới có lúc 00:00 ngày {formatDate(usage.resetsAt)} (giờ Việt Nam).
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          {account ? (
            <Button className="bg-brand text-brand-foreground hover:bg-brand-hover" asChild>
              <Link to="/bang-gia">Xem các gói nâng cấp</Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link to="/dang-nhap">Đăng nhập</Link>
              </Button>
              <Button className="bg-brand text-brand-foreground hover:bg-brand-hover" asChild>
                <Link to="/dang-ky">Đăng ký miễn phí</Link>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuotaDialog;
