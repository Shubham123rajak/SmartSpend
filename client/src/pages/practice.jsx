import {useState, useEffect} from "react"
import { useAuth } from "../hooks/useAuth";
import { expenseService } from "../services/expenseService";

defaultForm = {
     amount: "",
     categry: "FOOD",
     title : "",
     date: ""
}
function practice(){
    const {user, logout} = useAuth();
    const {expense, setExpense} = useState([]);
    const {form, setForm} = useState(defaultForm);
    const {aiMessage, setAimessage} = useState("");
    const {error,setError} = useState("");

    const loadexpense = async () =>{
          try{
            const data = await expenseService.getExpenses();

            setExpense(data.expense)
          }catch(RequestError){
            setError(RquestError.response?.data?.message || "error in loading expense")
          }
    }

    useEffect(()=>{
      loadexpense();
    },[])

    const handleChange = (event) =>{
        setForm((current)=>({
           ...current,
        
           [event.target.name] : [event.tartget.value]
        }))
    }

    const handleCreateExpense = async (event) =>{
        event.prevantDefault();
        setError("");
        
        try{
         await expenseService.createExpense(form);
        setExpense(defaultFormd);
        await loadexpense()

        }catch(error){
            setError(error.response?.data?.message || "Enternal error")
        }
        
    }
    const handleDeletExpense = async (id) =>{
        try{
         await expenseService.deleteExpense(id);
         setExpense((prev)=> prev.filter((e)=>e.id!==e.id));
        }catch(error){
            setError(error.reponse?.data?.message);
        }

    }
    return (
        <div className="page-shell">
            <div className="cart">
                <section>
                    
                    <h2>Dashboard</h2>
                    <p> Welcome to expense {user.name}</p>
                    
                </section>
                <section className="stack">
          <h2>Parse with AI</h2>
          <div className="toolbar">
            <input
              value={aiText}
              onChange={(event) => setAiText(event.target.value)}
              placeholder="spent 200 on pizza"
            />
            <button className="button" onClick={handleParseExpense} type="button">
              Parse
            </button>
          </div>
        </section>
                <section>

                </section>
            </div>
            
        </div>
    )
}